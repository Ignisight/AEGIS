# QR Attendance System - Full App (v2.1.0)

This is the unified React Native (Expo) mobile application for the NIT Jamshedpur Attendance System, featuring a robust multi-role architecture for both Teachers and Students.

### 📥 Download the App

Download the latest compiled **v2.1.0 APK directly onto your Android device** using the official Expo Cloud Build link:
👉 [Download Android APK (v2.1.0)](https://expo.dev/accounts/ignisight/projects/attendance-system/builds/97c32440-2dff-49b5-890e-e51063044acb)

---

### 🔥 v2.1.0 Major Features & Security Upgrades

#### 🛡 Security Lockdowns
- **Strict Device Hardware Binding:** Enforces `1 Phone = 1 Email` logic. Once a student registers an email on a physical phone hardware ID, that phone can *never* be used by another student. This completely blocks attendance sharing/proxy attendance from a single device.
- **Official App Validation (`x-app-secret`):** The backend API is entirely locked down. Generic POST requests (from Postman, curl, Python scripts) without the compiled app secret key (`x-app-secret`) will be instantly rejected as `403 Access Denied`.
- **Location Timeout Grace:** Instead of breaking the app when a student is indoors with no GPS signal, the Teacher map loader strictly times out after 5 seconds, forcefully bypassing Android high-accuracy hangups to start the session.

#### 👥 Multi-Role unified Experience
- **Teacher View:** Secure login for Professors, live QR Code sessions, GPS Geofencing, historical CSV exports, and 10-minute auto-timeout sessions. 
- **Student View:** Replaced web-view based submissions with a fully native Student View inside the exact same APK. They login via their `@nitjsr.ac.in` email and their device is permanently crypto-hashed.
- **Smart Email Parser:** Automatically pulls the Batch Year, Program (UG/PG), Branch (CS/CM/ECE), and Registration number directly from the `nitjsr.ac.in` student email structure and beautifully renders them on a native drawer dashboard.

#### 📷 QR Scanner Engineering 
- **Dynamic Live Scanning:** Super-fast live camera QR scanning within a localized Android View component.
- **Offline Protocol / Gallery Upload:** Full `multer` + `Jimp` V1 API integration allowing off-network students to upload photos of the teacher's QR code from their camera roll and submit safely to the Render cloud backend.

### Requirements:
- Android 9.0+
- The Node.js Backend Server must be active (This compiled build targets the deployed Render node server in `config.ts`).
