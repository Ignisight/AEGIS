# QR Attendance System — Mobile App (v2.2.0)

A secure React Native (Expo) mobile application for NIT Jamshedpur's attendance system. Multi-role architecture for Teachers and Students in a single APK.

### 📥 Download the App

Download the latest **v2.2.0 APK** for Android:
👉 [Download Android APK (v2.2.0)](https://expo.dev/accounts/ignisight/projects/attendance-system/builds/9fdb1955-5354-49db-82e9-357b0e3b64b0)

---

### 🔐 v2.2.0 — Security & Persistence Upgrade

#### 🍃 MongoDB Atlas (Persistent Cloud Storage)
- All data now persists permanently in MongoDB Atlas — **zero data loss on server restarts or redeployments**.
- Teacher accounts, student device bindings, sessions, and attendance records are all cloud-stored.
- Sessions retained 6 months, attendance records retained 4 years (auto-cleanup via TTL indexes).

#### 🔒 OTP Password Reset (Hardened)
- OTP is **bcrypt-hashed** before storage — never saved as plaintext.
- OTP generated using **`crypto.randomInt()`** (cryptographically secure, not `Math.random`).
- **Rate limiting:** 5 failed OTP attempts → 15-minute lockout.
- **Cooldown:** 60 seconds between OTP requests (prevents email spam).
- OTP **never exposed** in API responses, console logs, or client UI.
- Emails delivered via **Brevo HTTP API** (300 emails/day free).

#### 🛡 Secret Key Rotation
- `APP_SECRET_KEY` rotated and removed from source code entirely.
- Key injected at build time via EAS Secrets + `.env` (never in GitHub).
- Old exposed key permanently rejected (403).

#### 🛡 Device Security (from v2.1.0)
- **1 Phone = 1 Email** — hardware device binding prevents proxy attendance.
- **`x-app-secret` header** — blocks Postman/curl/script access to the API.
- Device IDs SHA-256 hashed via `expo-crypto`.

#### 👥 Multi-Role Unified Experience
- **Teacher:** Login, live QR sessions, GPS geofencing, CSV exports, 10-min auto-timeout.
- **Student:** Native QR scanner, gallery upload fallback, device-bound login.
- **Smart Email Parser:** Extracts batch year, program, branch, and roll number from `@nitjsr.ac.in` emails.

### Requirements
- Android 9.0+
- Backend server must be active ([attendance-server-ddgs.onrender.com](https://attendance-server-ddgs.onrender.com))
