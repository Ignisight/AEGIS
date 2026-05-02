# AEGIS: FAANG-Grade Security Audit Playbook
**Role:** Principal Security Engineer & Distributed Systems Architect
**System:** AEGIS (Zero-Trust Attendance System)
**Goal:** Self-executable, verifiable, and evidence-based audit guide for production-grade security and resilience.

---

## 1. THREAT MODEL & DATA CLASSIFICATION

### 1.1 Threat Model
To secure the system, we must define the adversaries we are defending against:
- **Insider (Student Cheating)**: Attempting proxy attendance via device sharing, photo replay, or GPS spoofing.
- **External Attacker (API Abuse)**: Attempting to flood the system, bypass rate limits, or discover API keys.
- **Reverse Engineer**: Decompiling the React Native APK/AAB to extract secrets or understand HMAC generation.
- **ML Attacker**: Using deepfakes, virtual cameras, or adversarial noise to bypass the ArcFace liveness checks.

### 1.2 Data Sensitivity Classification
- **Face Embeddings (ArcFace Vectors)**: **Highly Sensitive (Biometric)**. Must be protected by strict RLS in Supabase.
- **Device IDs & Location History**: **Sensitive**. Must not be exposed via public APIs.
- **Attendance Logs**: **Moderate**. Still requires authorization to view or modify.

---

## 2. SYSTEM FLOW BREAKDOWN

Before auditing, you must understand the exact path of execution, trust boundaries, and data entry points.

### 2.1 Step-by-Step Request Lifecycle
1. **Device Initialization**: App generates/retrieves `deviceId`, checks for root/jailbreak, and ensures Mock Locations are disabled.
2. **Identity Phase**: Camera captures frame -> sent to Python FastAPI AI Service -> checks Liveness (Moire) -> checks Embedding (ArcFace vs Supabase) -> returns temporary identity token/boolean.
3. **Location Phase**: App captures GPS coordinates + accuracy metric.
4. **Assembly Phase**: App scans QR (session context), bundles Identity result + GPS + Timestamp + Nonce.
5. **Cryptographic Phase**: App signs the bundle using HMAC-SHA256 with a shared secret or device-specific key.
6. **Backend Ingestion**: Node.js Express receives request -> Rate limiter -> HMAC Middleware -> Nonce/Replay check -> Timestamp check.
7. **Business Logic Phase**: Express queries MongoDB (is session active? is location within radius?).
8. **Persistence Phase**: Idempotent DB write to MongoDB `Attendance` collection.

### 2.2 Trust Boundaries
*   **Untrusted (Red Zone)**: Mobile App (React Native), Network Layer, User GPS sensor, User Camera. *Assume all data originating here is potentially spoofed.*
*   **DMZ (Yellow Zone)**: Nginx/Ingress layer, Express Rate Limiters.
*   **Trusted (Green Zone)**: Node.js core logic, Python AI Service, MongoDB, Supabase.

### 2.3 Data Entry Points
*   `/api/attendance` (POST) - High risk (Spoofing/Replay).
*   `/verify-face` (POST multipart/form-data) - High risk (Adversarial ML, DOS via large images).
*   `/api/register` (POST) - Medium risk (Device binding bypass).

---

## 3. SECURITY CHECKLIST (DETAILED)

*Every test below must produce empirical evidence. Theoretical checks are invalid.*

### 3.1 Request Signing, API Security & Time-Based Attacks
*   **Severity**: Critical
*   **Impact**: Replay attack, burst timing, or clock skew bypasses allow duplicate/remote attendance.
*   **What to verify**: Ensures the payload hasn't been tampered with and strictly adheres to temporal boundaries.
*   **How to test**: 
    1. Intercept a valid attendance request using Proxyman or Burp Suite.
    2. Change the `timestamp` or `location` in the JSON body. Forward the request.
    3. Re-send the exact original, unmodified request 1 minute later.
    4. **Clock Skew Test**: Send a request with timestamp `+5 mins` (future) and `-5 mins` (past).
*   **Verification Evidence to Collect**:
    *   Response Code = `401 Unauthorized` for modified, replayed, and skewed requests.
    *   Log entry: `"Invalid signature"`, `"Replay attack detected"`, or `"Request expired"`.
    *   DB State: No new attendance record is written. Nonce must exist in DB.
*   **Fix / Code Example (Secure Version)**:
```javascript
// middleware/hmacAuth.js
const crypto = require('crypto');
const Nonce = require('../models/Nonce'); 

async function verifySignatureAndReplay(req, res, next) {
    const signature = req.headers['x-signature'];
    const { email, sessionId, timestamp, nonce } = req.body;
    
    const now = Date.now();
    if (Math.abs(now - timestamp) > 30000) return res.status(401).json({ error: "Request expired" });

    const secret = process.env.APP_SECRET_KEY;
    const payload = `${email}:${sessionId}:${timestamp}:${nonce}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return res.status(401).json({ error: "Invalid signature" });
    }

    try {
        await Nonce.create({ _id: nonce, createdAt: new Date() }); // TTL expires in 60s
    } catch (err) {
        if (err.code === 11000) return res.status(401).json({ error: "Replay attack detected" });
        throw err;
    }
    next();
}
```

### 3.2 Face Recognition Pipeline
*   **Severity**: Critical
*   **Impact**: Face spoofing allows proxy attendance, defeating the core biometric system.
*   **What to validate**: AI service must reject non-human faces, digital screens, and incorrect identities without crashing under load.
*   **Attack Success Criteria**:
    *   System returns `verified: true`.
    *   AND attendance is successfully marked in DB using the spoofed face.
*   **Verification Evidence to Collect**:
    *   Response Code = `400` or `403` with `verified: false`.
    *   Log entry: `"MOIRE_DETECTED"` or `"Liveness challenge failed"`.
    *   DB State: No attendance recorded for the session.

### 3.3 Location Verification
*   **Severity**: High
*   **Impact**: GPS spoofing allows remote check-ins.
*   **How to test spoofing**: Download "Fake GPS location" from the Play Store. Enable "Developer Options" -> "Select mock location app". Set location to the classroom. Try to mark attendance from home.
*   **Verification Evidence to Collect**:
    *   Response Code = `403 Forbidden`.
    *   Log entry: `"Mock location detected"` or `"Impossible travel velocity detected"`.
    *   DB State: No attendance written.

### 3.4 Device Binding
*   **Severity**: High
*   **Impact**: Device multiplexing allows one "buddy" phone to mark attendance for multiple students.
*   **How to test**: Log in as Student A. Mark attendance. Log out. Log in as Student B on the *same physical phone*. Try to mark attendance.
*   **Verification Evidence to Collect**:
    *   Response Code = `403 Forbidden`.
    *   Log entry: `"DEVICE_SHARING_ATTEMPT"` containing `deviceId` and `attemptedEmail`.

### 3.5 Database & Idempotency
*   **Severity**: Medium
*   **Impact**: Race conditions inflate attendance records or cause inconsistent system state.
*   **How to test**: Use a bash loop or parallel `curl` commands to hit the attendance endpoint 10 times simultaneously with the exact same valid payload.
*   **Verification Evidence to Collect**:
    *   Response Codes: Exactly 1 returns `200/201`. 9 return `409 Conflict` (or handled `200` with already marked message).
    *   DB State: `db.attendances.count({ email: "...", sessionId: "..." })` must equal `1`.

### 3.6 Supabase Security & Least Privilege Validation
*   **Severity**: Critical
*   **Impact**: Vector database exposure allows cloning biometric identities. Over-privileged backends expand the blast radius of a breach.
*   **How to test**: 
    1. Try `SELECT * FROM student_embeddings` via an anonymous public key.
    2. **Privilege Scope Check**: Can the Node.js `service_role` key access or delete tables it doesn't need to (e.g., `pg_authid`)?
*   **Verification Evidence to Collect**:
    *   Client SQL Error: `401 Unauthorized` or empty result set (`0` rows).
    *   DB State: Verify `service_role` grants are strictly limited to the `student_embeddings` schema.

### 3.7 Authorization Edge Cases (AuthZ)
*   **Severity**: Critical
*   **Impact**: Privilege escalation allows students to act as teachers.
*   **How to test**:
    *   Student accessing teacher API (`/api/create-session`).
    *   Modifying another user’s data (changing email or face vector).
    *   Session ownership (Teacher A trying to close Teacher B's session).
*   **Verification Evidence to Collect**:
    *   Response Code = `403 Forbidden`.
    *   Log entry: `"Unauthorized role access attempted"`.

---

## 4. EDGE FAILURE & NEGATIVE TESTING

Standard penetration testing must include malformed and chaotic inputs.

### 4.1 Invalid Payload Fuzzing
*   **Test**: POST `/api/attendance` with an empty JSON body, missing fields, or corrupted JSON strings.
*   **Expected Evidence**: 
    *   Response = `400 Bad Request`.
    *   Node.js process memory does not spike.
    *   No Express stack trace returned to client.

### 4.2 Malformed Image Fuzzing
*   **Test**: POST `/verify-face` with random bytes, a corrupted JPEG header, or a text file renamed to `.jpg`.
*   **Expected Evidence**: 
    *   Response = `400 Bad Request` or `422 Unprocessable Entity`.
    *   FastAPI backend DOES NOT CRASH (no 500 error). OpenCV/Pillow errors are caught gracefully.

---

## 5. PERFORMANCE & RESOURCE AUDIT

Security also means resilience against Resource Exhaustion (DoS).

### 5.1 CPU / Memory Checks
*   **Test**: Run 50 concurrent requests against `/api/attendance` using Artillery or JMeter.
*   **Expected Evidence**:
    *   Node.js CPU usage stays < 80%.
    *   Memory footprint remains stable (no memory leaks evident via garbage collection monitoring).

### 5.2 AI Bottleneck Test
*   **Test**: Fire 50 concurrent image uploads to Python FastAPI `/verify-face`.
*   **Expected Evidence**:
    *   Monitor latency spikes (Does 1 request take 30s now?).
    *   Does a queue form? If so, are requests timing out cleanly (e.g., returning 503) instead of hanging indefinitely?

---

## 6. SECRET EXPOSURE & SUPPLY CHAIN AUDIT

### 6.1 Secret Exposure Checks
*   **Severity**: Critical
*   **Test**: Audit server logs, response headers, and environment setups.
*   **Verification Evidence to Collect**:
    *   `APP_SECRET_KEY` or DB URIs do not appear in any `console.log` or production file log (`winston`).
    *   JWTs/Tokens are not logged.
    *   Error messages sent to clients do not contain DB schema details or stack traces.

### 6.2 Dependency & Supply Chain
*   **Severity**: High
*   **Test**: Run `npm audit` and `pip-audit`.
*   **Verification Evidence to Collect**:
    *   No Critical or High vulnerabilities in direct dependencies.
    *   Verify versions of critical packages (`jsonwebtoken`, `express`, `mongoose`, `fastapi`, `opencv-python`).

---

## 7. RED TEAM TESTING GUIDE

Execute these tests against your staging environment. 

### Attack 1: Replay Attack
1. **Steps**: Connect phone to laptop running Proxyman/Burp Suite. Mark attendance. Find the `POST /api/attendance` request. Right click -> "Repeat/Replay". Send it 60 seconds later.
2. **Attack Success Criteria**: System returns `200` and duplicate DB entry is written. (If so, FAIL).

### Attack 2: Face Spoofing
1. **Steps**: Use an iPad. Display a high-res, brightly lit portrait of the registered student. Hold it in front of the scanning phone. Gently rock the iPad to simulate movement.
2. **Attack Success Criteria**: System returns `verified: true` and attendance is marked. (If so, FAIL).

### Attack 3: API Flooding
1. **Steps**: Run `ab -n 1000 -c 50 "http://api.aegis.com/api/login"` (Apache Bench) to simulate 50 concurrent users spamming 1000 requests.
2. **Attack Success Criteria**: Server crashes, becomes unresponsive to legitimate users, or allows brute-force. (If so, FAIL).

---

## 8. INCIDENT RESPONSE & RECOVERY

Detecting an attack is only half the battle. This section validates system recovery and automated response mechanisms.

### 8.1 Automated Isolation
*   **Severity**: High
*   **Test**: Trigger the rate limiter and anomaly detection (e.g., 5 failed face verifies in 1 min).
*   **Verification Evidence to Collect**:
    *   System immediately flags the account (`isSuspicious: true` in MongoDB).
    *   The student's active sessions are killed.
    *   Subsequent requests from that `deviceId` or IP return `403 Forbidden`.

### 8.2 Escalation & Notification
*   **Severity**: Medium
*   **Test**: Simulate a device multiplexing attack (Buddy System).
*   **Verification Evidence to Collect**:
    *   Log escalated to critical security queue.
    *   Teacher/Admin dashboard receives a real-time alert or email notification regarding the flagged student.

---

## 9. FINAL AUDIT REPORT TEMPLATE

After running the entire playbook, fill out this report.

```text
======================================================
AEGIS SECURITY AUDIT REPORT
======================================================
System: AEGIS Zero-Trust Attendance
Audit Date: [YYYY-MM-DD]
Auditor: [Name]

1. CRITICAL ISSUES IDENTIFIED
- [ ] Issue: Replay protection failing under high concurrency.
      Evidence: DB shows duplicate entries for same nonce.
      Fix Required: Implement TTL index on Nonce schema.

2. HIGH ISSUES IDENTIFIED
- [ ] Issue: ...

3. MEDIUM ISSUES IDENTIFIED
- [ ] Issue: ...

4. PASSED CHECKS (VERIFIED)
- [x] Face Spoofing (Moire Check) - Blocked iPad replay (Log: MOIRE_DETECTED)
- [x] RLS on Supabase - Service Key restricted
- [x] Malformed JSON Fuzzer - Graceful 400 Bad Request returned
- [x] NPM Audit - 0 High/Critical vulnerabilities found
- [x] Clock Skew Test - 5 min future/past requests successfully rejected

5. PERFORMANCE & INCIDENT METRICS
- Concurrent Load (50 req/s): Handled gracefully, AI avg latency: 1.2s
- Automated Isolation: Successfully suspended account on 5th failed face scan.

OVERALL RATING:
[ ] Fails Requirements
[ ] Minimum Viable Security
[ ] Industry-Grade
[ ] FAANG/Enterprise-Grade 
======================================================
```
