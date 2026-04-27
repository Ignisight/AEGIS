# 🛡️ A.E.G.I.S — Automated Entry Geo-fenced Identification System

A.E.G.I.S is a high-security, anti-proxy attendance system designed for NIT Jamshedpur. It combines **Biometric Face Verification** with **Background Geo-fencing** to ensure that students are physically present in the classroom for the entire duration of a session.

## 🚀 Key Features

### 1. High-Integrity Biometric Verification
*   **3-Photo Motion Burst**: Captures 3 high-speed photos (300ms gap) to detect "Static Content" (photos-of-photos) or video replays.
*   **Best Frame Selection**: Automatically picks the sharpest frame for identity matching against the "Golden Template".
*   **Anti-Spoofing**: Integrated Moire pattern detection and Laplacian blur checks on the AI server.

### 2. Intelligent Geo-fencing
*   **Background Tracking**: Uses `expo-task-manager` and Foreground Services to keep tracking active even if the app is minimized.
*   **Mock Location Blocking**: Hardcoded security checks to detect and block "Fake GPS" apps.
*   **Status Flipping**: Automatically logs "Entry" and "Exit" events to the server if a student leaves the classroom radius.

### 3. Teacher Dashboard
*   **QR Generation**: Dynamic QR codes with embedded session metadata.
*   **Real-time Responses**: Live view of students as they verify their identity.
*   **6-Month History**: Unified, high-performance history list powered by MongoDB aggregation.

## 🛠️ Technology Stack
*   **Framework**: React Native (Expo SDK 51+)
*   **Location**: Expo Location + TaskManager
*   **Camera**: Expo Camera (Face Detection API)
*   **Security**: SHA-256 Request Signing + Screen Capture Prevention

## 📦 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Ignisight/AEGIS.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your server:
   Update `src/config.ts` with your backend URL.
4. Run locally:
   ```bash
   npx expo start
   ```

## 🔒 Security Policy
This app implements strict anti-proxy measures. Any attempt to use emulators, screen recordings, or mock locations is automatically logged as a security violation to the administrator.

---
**Developed for NIT Jamshedpur** 🏛️
