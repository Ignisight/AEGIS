# 📱 Nexisight Attendance App (v2.7.0)

A secure, multi-role React Native mobile application for NIT Jamshedpur's QR-based attendance system. Teachers create live sessions with dynamic QR codes, and students scan them to mark attendance. **This version includes hardened security against mock locations and emulators.**

### 📥 Download the App
👉 [Download Latest Official APK (v2.7.0)](https://expo.dev/artifacts/eas/fHUxobAcfjUCMFsc89j7wt.apk)

---

## 🧰 Tech Stack

| Technology | Purpose |
|---|---|
| **React Native** | Cross-platform mobile framework |
| **Expo SDK 54** | Managed workflow, build tooling, native APIs |
| **TypeScript** | Type-safe application logic |
| **React Navigation** | Screen navigation (native stack) |
| **expo-camera** | Live QR code scanning via device camera |
| **expo-image-picker** | Gallery upload fallback for QR scanning |
| **expo-location** | GPS coordinates for geofenced attendance |
| **expo-crypto** | SHA-256 hashing for device ID binding |
| **expo-device** | Hardware device identification |
| **expo-constants** | Build-time secret injection via app.config.js |
| **expo-file-system** | Local file operations for exports |
| **expo-sharing** | Share exported attendance files |
| **expo-keep-awake** | Prevent screen sleep during active sessions |
| **expo-linear-gradient** | UI gradient backgrounds |
| **react-native-qrcode-svg** | Dynamic QR code generation |
| **react-native-view-shot** | QR code screenshot capture |
| **react-native-svg** | SVG rendering for QR codes |
| **AsyncStorage** | Persistent local storage (login state, settings) |
| **EAS Build** | Cloud APK compilation via Expo Application Services |

---

## 📁 Project Structure

```
AttendanceSystem/
├── App.tsx                      # Root component & navigation setup
├── app.config.js                # Dynamic Expo config (secret injection)
├── eas.json                     # EAS Build profiles
├── .env                         # Local secrets (gitignored)
├── assets/                      # App icons & splash screen
└── src/
    ├── api.ts                   # API service layer (all server calls)
    ├── config.ts                # Server URL & secret key from Constants
    └── screens/
        ├── RoleScreen.tsx              # Role selector (Teacher / Student)
        ├── LoginScreen.tsx             # Teacher login
        ├── RegisterScreen.tsx          # Teacher registration
        ├── ForgotPasswordScreen.tsx    # OTP password reset flow
        ├── HomeScreen.tsx              # Teacher dashboard (start session)
        ├── SessionScreen.tsx           # Active session with live QR code
        ├── ResponsesScreen.tsx         # Live attendance responses list
        ├── HistoryScreen.tsx           # Past sessions & CSV export
        ├── SettingsScreen.tsx          # Profile, password, server config
        ├── StudentLoginScreen.tsx      # Student device registration
        ├── StudentDashboardScreen.tsx  # Student home with drawer nav
        └── StudentScannerScreen.tsx    # QR scanner + gallery upload
```

---

## 👥 App Roles

### 🎓 Teacher Mode
- **Register / Login** with `@nitjsr.ac.in` email or Google Sign-In
- **Start Session** — generates a dynamic QR code with GPS location
- **Live Monitoring** — real-time view of students who have scanned
- **Auto-Timeout** — sessions automatically stop after 10 minutes
- **History** — view all past sessions with attendance counts
- **Export** — download individual attendance as Excel (.xlsx) files
- **Strict Naming** — files follow `attendance_<subject>_<date>_<time>.xlsx` format
- **Isolated Downloads** — removed ZIP merging for better data integrity
- **Password Reset** — secure OTP sent to email via Brevo
- **Profile Settings** — update name, college, department, change password

### 🧑‍🎓 Student Mode
- **Login** with `@nitjsr.ac.in` email — device permanently bound
- **Smart Email Parser** — extracts batch year, program (UG/PG), branch (CS/ECE/CM), and roll number from email format
- **Dashboard** — personalized drawer with parsed student info
- **QR Scanner** — live camera scanning with instant submission
- **Gallery Upload** — offline fallback: take photo of QR, upload from gallery
- **GPS Verification** — attendance only accepted within teacher's geofence radius

---

## 🔒 Security Features

| Feature | Description |
|---|---|
| **Request Signing** | Cryptographic signatures (SHA-256) + 60s timestamp window — prevents replay attacks |
| **Mock Location Block**| Natively detects and blocks "Fake GPS" and mock location application usage |
| **Emulator Blocking** | Hardware-level identification blocks app usage on emulators/virtual devices |
| **Device Binding** | 1 phone = 1 student email (SHA-256 hashed device ID, permanent) |
| **Build-time Secrets** | APP_SECRET_KEY injected via EAS Secrets, not in source code |
| **GPS Geofencing** | Student must be within configured radius of teacher's location |

---

## ⚙️ Configuration

### `src/config.ts`
| Setting | Value |
|---|---|
| `DEFAULT_SERVER_URL` | `https://attendance-server-ddgs.onrender.com` |
| `APP_SECRET_HEADER` | Loaded from `expo-constants` (EAS secret) |
| `SESSION_DURATION_MS` | 10 minutes (600,000 ms) |
| `REFRESH_INTERVAL_SEC` | 10 seconds |

### Environment Variable (EAS Secret)
| Variable | Description |
|---|---|
| `APP_SECRET_KEY` | API authentication key (injected at build time) |

---

## 🚀 Build & Run

### Local Development
```bash
npm install
npx expo start
```

### Build APK (Cloud)
```bash
npx eas-cli build --platform android --profile preview
```

### Requirements
- Android 9.0+
- Backend server must be active
- EAS account for cloud builds
