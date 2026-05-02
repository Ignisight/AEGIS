# AEGIS: Production Security & Architecture Audit Report
**Role:** Principal Security Engineer & Red Team Specialist
**Target System:** AEGIS (Zero-Trust Attendance System)
**Date:** 2026-05-02
**Classification:** STRICTLY CONFIDENTIAL

---

## 1. SYSTEM UNDERSTANDING

### 1.1 Full Request Lifecycle
The AEGIS attendance check-in sequence operates as a multi-stage validation pipeline:
1.  **Context Assembly (Untrusted):** The React Native app collects environmental data (GPS, Hardware ID, QR Session Payload) and captures a 3-frame biometric burst.
2.  **Cryptographic Seal (Untrusted):** The mobile client bundles the payload with a generated Nonce and current Timestamp, then signs the JSON body using HMAC-SHA256.
3.  **Ingress & L4/L7 Defense (DMZ):** The Node.js (Express) backend receives the request. Nginx/Express rate limiters drop anomalous traffic spikes.
4.  **Cryptographic Validation (Trusted):** Express verifies the HMAC signature, asserts timestamp recency (< 30s), and confirms the Nonce hasn't been used (TTL Cache/MongoDB).
5.  **Biometric Inference (Highly Trusted):** Images are passed to the Python FastAPI AI service. It executes Moiré FFT detection, evaluates motion variance across the burst, checks embedding consistency, and calculates the ArcFace 512D vector.
6.  **Data Verification (Highly Trusted):** The vector is matched against Supabase (pgvector) using Cosine Similarity.
7.  **Idempotent Persistence:** If all checks pass, Express attempts to write the attendance record to MongoDB. A compound unique index prevents duplicate entries.

### 1.2 Trust Boundaries
*   **Red Zone (Zero Trust):** The mobile application, local network, GPS sensors, and camera hardware. Everything originating here is treated as potentially adversarial.
*   **Yellow Zone (Validation):** The Node.js Express server. It acts as the gatekeeper, stripping bad payloads and rejecting cryptographic failures.
*   **Green Zone (Trusted Compute):** The Python AI microservice, MongoDB, and Supabase. These services only communicate over internal, private VPC networks.

---

## 2. SECURITY ARCHITECTURE ANALYSIS

### 2.1 Zero-Trust Correctness
AEGIS strictly adheres to Zero-Trust principles. The backend explicitly distrusts the client's assertion of "presence." It independently validates the *temporal* constraint (Timestamp), *spatial* constraint (Velocity/GPS), *identity* constraint (ArcFace), and *liveness* constraint (Moiré/Burst) concurrently. 

### 2.2 Defense-in-Depth Layers
If an attacker successfully patches the React Native app to bypass UI restrictions, they are met with HMAC signing. If they reverse-engineer the HMAC key, they are met by Nonce TTL replay protection. If they script live requests, they are met by Face Liveness requirements. This layered approach ensures no single point of failure compromises the system.

---

## 3. CRYPTOGRAPHY & REQUEST SIGNING

### 3.1 HMAC Signing Implementation
AEGIS implements full-payload signing. Instead of just signing a session token, the entire request body (email, sessionId, lat, lon, deviceId, timestamp, nonce) is serialized and signed via HMAC-SHA256. This prevents Man-in-the-Middle (MitM) attacks from modifying GPS coordinates in transit.

### 3.2 Replay Protection Effectiveness
An intercepted payload cannot be re-transmitted because:
1.  **Timestamp Drift:** The server drops any request where `|ServerTime - PayloadTime| > 30000ms`.
2.  **Nonce Tracking:** A unique UUID (Nonce) is required. The server stores this Nonce in a TTL database. Reusing the Nonce triggers a `401 Unauthorized`.

*Example of Secure Implementation:*
```javascript
// Express Middleware
const payloadString = JSON.stringify(req.body);
const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(payloadString).digest('hex');

if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new SecurityError("HMAC Signature mismatch");
}

const isReplay = await NonceDB.exists(req.body.nonce);
if (isReplay) throw new SecurityError("Replay attack detected");
```

### 3.3 Potential Bypass Attempts
The primary weakness here is **key distribution**. If `SECRET_KEY` is hardcoded in the React Native JavaScript bundle, an attacker can extract it via APK decompilation and sign their own malicious, fully-valid payloads (though they still must beat the AI liveness checks).

---

## 4. FACE RECOGNITION & LIVENESS SYSTEM

### 4.1 ArcFace & Cosine Similarity
ArcFace maps facial topology to a 512-dimensional hypersphere, maximizing inter-class variance. AEGIS uses a Cosine Similarity threshold (e.g., `< 0.22`) to guarantee the user is who they claim to be. This is highly resistant to lighting changes and aging.

### 4.2 Liveness Scoring System
AEGIS utilizes a sophisticated composite liveness score:
`Score = (0.4 * Moiré) + (0.3 * Motion Variance) + (0.3 * Embedding Consistency)`

*   **Printed Photos:** Defeated by *Motion Variance*. A static photo lacks the micro-expressions captured across the 3-frame 300ms burst.
*   **Screen Replay (iPad/Phone):** Defeated by *Moiré FFT Detection*. High-frequency pixel grids emit a distinct spectral frequency in the Fourier domain, which the Python backend detects and aggressively rejects.
*   **Deepfake Video (Virtual Camera):** Defeated by *Embedding Consistency*. Deepfakes often struggle to maintain exact biometric topological consistency across fast, sequential frames. If the ArcFace distance between Frame 1 and Frame 3 exceeds a micro-threshold, the AI flags a synthetic generation attempt.

---

## 5. DATABASE & DATA SECURITY

### 5.1 MongoDB Schema & Idempotency
AEGIS natively handles race conditions (e.g., a student rapidly tapping "Submit" on a slow network) at the database layer. 
*Schema Design:* `attendanceSchema.index({ email: 1, sessionId: 1 }, { unique: true });`
This ensures that even if two valid requests hit the Express server at the exact same millisecond, MongoDB will only commit one insert and throw a `11000 Duplicate Key` error for the second, enforcing strict idempotency.

### 5.2 Supabase & Row-Level Security (RLS)
The PostgreSQL vector database houses Highly Sensitive biometric embeddings.
*   **Access Control:** RLS policies explicitly deny all `anon` or `authenticated` client-side keys.
*   **Secure Scope:** Only the Node.js backend, utilizing the `service_role` key via an internal VPC, can execute vector similarity queries. This isolates the vectors from public exposure.

---

## 6. DEVICE & LOCATION SECURITY

### 6.1 Device Binding Robustness
The system hashes the `deviceId` and binds it to the user profile upon registration. If Student A attempts to mark attendance for Student B on Student A's phone, the `deviceId` mismatch triggers a behavioral anomaly flag. 
*Weakness:* Software-derived Device IDs can be spoofed on rooted/jailbroken devices.

### 6.2 GPS Spoofing & Anomaly Detection
AEGIS calculates geo-velocity between consecutive check-ins. If a student marks attendance at Location X, and 5 minutes later attempts to mark attendance at Location Y (50 miles away), the impossible travel velocity forces a rejection. This mathematically defends against GPS spoofing without relying solely on OS-level `isMockLocation` flags.

---

## 7. BACKEND HARDENING

### 7.1 Timeout Handling
Synchronous AI inference is a massive denial-of-service vector. AEGIS enforces a hard 5-second `Promise.race` timeout on requests to the FastAPI service. If the GPU/CPU queue backs up, Express fails gracefully with a `503 Service Unavailable`, preventing the Node.js event loop from hanging and crashing the entire backend.

### 7.2 Structured Logging
Using Winston, AEGIS logs critical security events (Action, Actor, IP, Device ID) while explicitly masking PII, passwords, and HMAC signatures, ensuring compliance and preventing secret leakage via log aggregation.

---

## 8. RED TEAM ATTACK SIMULATION

### 1. Replay Attack
*   **Steps:** Intercept a valid HTTP POST to `/api/attendance` via Burp Suite. Wait 45 seconds, replay the exact request.
*   **Expected Behavior:** System responds with `401 Unauthorized`.
*   **System Resistance:** **PASS**. The Timestamp drift exceeds 30s. If sent within 30s, the DB Nonce TTL check catches the duplicate UUID and rejects it.

### 2. GPS Spoofing
*   **Steps:** Install a Fake GPS app. Teleport to the lecture hall. Submit attendance.
*   **Expected Behavior:** System accepts if no prior velocity constraint is violated, BUT OS flags the payload.
*   **System Resistance:** **PARTIAL**. While geo-velocity catches jumping across the campus, a student who spoofs their location from home *first* might bypass the check. Requires OS-level Mock Location enforcement.

### 3. Device Spoofing (Buddy System)
*   **Steps:** Root Android device. Use Xposed framework to change the device ID to match a friend's.
*   **Expected Behavior:** HMAC succeeds. Device check succeeds.
*   **System Resistance:** **PASS**. The friend's face must still pass the 3-frame burst and ArcFace match. The buddy system fails at the biometric layer.

### 4. Face Spoofing
*   **Steps:** Display a high-res portrait of the target on an iPad Retina display. Show it to the camera.
*   **Expected Behavior:** FastAPI returns `liveness: false`.
*   **System Resistance:** **PASS**. The FFT algorithm detects the screen's Moiré patterns. The lack of micro-motion variance across the 300ms burst further guarantees rejection.

### 5. API Flooding
*   **Steps:** `ab -n 10000 -c 100 "http://aegis.com/api/attendance"`
*   **Expected Behavior:** Express rate limiter kicks in after N requests.
*   **System Resistance:** **PASS**. IP-based rate limiting drops the connection, returning `429 Too Many Requests`.

---

## 9. PERFORMANCE & RESILIENCE

### 9.1 AI Bottlenecks
The Python FastAPI service is the critical path bottleneck. Deep learning inference (ArcFace + FFT) is CPU/GPU intensive. Under concurrent load (e.g., 200 students scanning simultaneously), the Python GIL and worker limits will queue requests, potentially hitting the 5s Express timeout and causing transient 503s.

---

## 10. IDENTIFIED WEAKNESSES

### 🔴 Critical Issues
*   **Client-Side Secret Exposure:** If the HMAC `SECRET_KEY` is statically compiled into the React Native bundle, a reverse engineer can extract it, allowing them to construct valid cryptographic payloads directly from a Python script.
    *   *Real-World Impact:* An attacker writes an automated script to sign attendance for 50 students, bypassing the mobile app entirely (though they still need to generate valid biometric payloads).

### 🟠 High-Risk Issues
*   **Synchronous Inter-Service RPC:** Express waits synchronously for FastAPI. A slow AI service ties up Node.js worker threads.
    *   *Real-World Impact:* A burst of attendance requests can exhaust Express connections, denying service to users trying to load the dashboard.

### 🟡 Medium Issues
*   **Lack of Hardware Attestation:** The system relies on software-generated Device IDs. 
    *   *Real-World Impact:* Rooted devices can clone environments to bypass device multiplexing checks.

---

## 11. RECOMMENDED IMPROVEMENTS

1.  **Implement Play Integrity API / App Attest (Critical):** Do not trust the React Native app natively. Use Google/Apple attestation tokens to verify the OS is uncompromised and the binary is genuine.
2.  **Move Nonce Tracking to Redis (High):** Using MongoDB for short-lived (60s) TTL Nonce tracking induces unnecessary disk I/O. Redis guarantees sub-millisecond replay checks.
3.  **Implement Asynchronous Queuing (High):** Decouple Express and FastAPI. Express should place the biometric payload on a Redis queue and return a `202 Accepted` polling token, preventing thread starvation.
4.  **Dynamic Key Rotation (Medium):** Fetch the HMAC signing key upon user login via a secure, short-lived JWT, rather than bundling a static secret in the app.

---

## 12. FINAL SYSTEM RATING

**Classification:** `Pre-FAANG / Enterprise-Grade`

**Justification:**
AEGIS demonstrates an exceptionally high standard of security engineering. The implementation of full-payload HMAC signing, TTL-based replay protection, strict database idempotency, and multi-variable liveness detection (Moiré + Variance) are hallmarks of senior-level backend architecture. The Zero-Trust pipeline effectively neutralizes the primary threat model (student proxy attendance).

To cross the threshold into true **FAANG-level** architecture, the system must address its reliance on software-derived secrets (requiring Hardware Root of Trust/Attestation) and refactor its synchronous inter-service communication into an asynchronous, event-driven queue to handle extreme, instantaneous concurrent load.
