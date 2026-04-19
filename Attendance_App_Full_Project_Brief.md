
# Attendance App — Full Project Brief

---

## 1. PROJECT OVERVIEW
- **App Name**: Nexisight Attendance App
- **Version**: 2.7.0
- **Purpose**: A secure, multi-role React Native mobile application for a QR-based attendance system using Google Apps Script as the backend. Teachers create live sessions with dynamic QR codes, and students scan them to mark attendance.
- **Target Users**: Teachers and Students at NIT Jamshedpur (@nitjsr.ac.in).
- **Current Deployment Status**: Android APK deployed via Expo/EAS. Backend deployed as a Google Apps Script Web App.

---

## 2. TECH STACK
- **Frontend**: React Native, Expo SDK 54, TypeScript, React Navigation. Includes `expo-location`, `expo-camera`, and `expo-crypto`.
- **Backend**: Google Apps Script (JavaScript) acting as API Server and Web UI.
- **Database**: Google Sheets (managed by App Script) with `Attendance` and `RollMap` sheets.
- **Third-Party Services**: EAS Build (Expo Application Services).

---

## 3. FULL FILE STRUCTURE
- `.gitignore`
- `app.config.js`
- `App.tsx`
- `apps-script/Code.gs`
- `eas.json`
- `index.ts`
- `LICENSE`
- `package.json`
- `README.md`
- `setup.js`
- `SETUP_GUIDE.md`
- `src/api.ts`
- `src/config.ts`
- `src/screens/ForgotPasswordScreen.tsx`
- `src/screens/HistoryScreen.tsx`
- `src/screens/HomeScreen.tsx`
- `src/screens/LoginScreen.tsx`
- `src/screens/RegisterScreen.tsx`
- `src/screens/ResponsesScreen.tsx`
- `src/screens/RoleScreen.tsx`
- `src/screens/SessionScreen.tsx`
- `src/screens/SettingsScreen.tsx`
- `src/screens/StudentDashboardScreen.tsx`
- `src/screens/StudentLoginScreen.tsx`
- `src/screens/StudentScannerScreen.tsx`
- `tsconfig.json`


*(Note: Ignoring `node_modules`, `assets`, `.expo`, and binary/lock files for clarity).*

---

## 4. FULL SOURCE CODE

### `.gitignore`

```text
node_modules/
.expo/
dist/
web-build/
.DS_Store
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
server/

# Secrets — NEVER push to GitHub
.env
.env.local
.env.production

```

### `app.config.js`

```js
module.exports = ({ config }) => {
    // Multi-Account Support: Toggle between 'ignisight' or 'nexisight' via environment variable
    const EXPO_ACCOUNT = process.env.EXPO_ACCOUNT || 'nexisight';
    const PROJECTS = {
      ignisight: { 
        id: "8fbb94c8-1140-415e-95c3-64e1da1b5cc3", 
        slug: "attendance-system" 
      },
      nexisight: { 
        id: "8f17474b-1110-47b2-86ff-26ab0cb198d2", 
        slug: "attendance-app" 
      }
    };
    
    const activeProject = PROJECTS[EXPO_ACCOUNT] || PROJECTS.nexisight;

    return {
        ...config,
        name: "Attendance System",
        slug: activeProject.slug,
        version: "2.7.0",
        orientation: "portrait",
        icon: "./assets/icon.png",
        userInterfaceStyle: "dark",
        newArchEnabled: false,
        jsEngine: "hermes",
        splash: {
            backgroundColor: "#0f172a",
        },
        android: {
            adaptiveIcon: {
                foregroundImage: "./assets/adaptive-icon.png",
                backgroundColor: "#0f172a",
            },
            package: "com.attendance.system",
        },
        runtimeVersion: {
            policy: "appVersion",
        },
        extra: {
            APP_SECRET_KEY: process.env.APP_SECRET_KEY || "MISSING_KEY",
            eas: {
                projectId: activeProject.id,
            },
        },
        plugins: [
            "expo-camera",
            "expo-location",
            [
                "expo-image-picker",
                {
                    photosPermission: "Allow Attendance System to access your photos to scan QR codes from gallery.",
                    cameraPermission: "Allow Attendance System to use camera to take pictures of QR codes.",
                },
            ],
        ],
    };
};

```

### `App.tsx`

```tsx
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import HomeScreen from './src/screens/HomeScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SessionScreen from './src/screens/SessionScreen';
import ResponsesScreen from './src/screens/ResponsesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import RoleScreen from './src/screens/RoleScreen';
import StudentLoginScreen from './src/screens/StudentLoginScreen';
import StudentDashboardScreen from './src/screens/StudentDashboardScreen';
import StudentScannerScreen from './src/screens/StudentScannerScreen';

const Stack = createNativeStackNavigator();

const DarkTheme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        background: '#0f172a',
        card: '#1e293b',
        text: '#f1f5f9',
        border: '#334155',
        primary: '#6366f1',
    },
};

export default function App() {
    return (
        <NavigationContainer theme={DarkTheme}>
            <StatusBar style="light" />
            <Stack.Navigator
                initialRouteName="RoleSelection"
                screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right',
                    contentStyle: { backgroundColor: '#0f172a' },
                }}
            >
                <Stack.Screen name="RoleSelection" component={RoleScreen} />
                <Stack.Screen name="StudentLogin" component={StudentLoginScreen} />
                <Stack.Screen name="StudentDashboard" component={StudentDashboardScreen} />
                <Stack.Screen name="StudentScanner" component={StudentScannerScreen} />

                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
                <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="History" component={HistoryScreen} />
                <Stack.Screen name="Session" component={SessionScreen} />
                <Stack.Screen name="Responses" component={ResponsesScreen} />
                <Stack.Screen name="Settings" component={SettingsScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}

```

### `apps-script/Code.gs`

```gs
// =====================================================
// Attendance System — Self-Contained Apps Script
// NO Google Forms needed! This script IS the form.
// =====================================================
//
// SETUP (one-time, 2 minutes):
//   1. Go to script.google.com → New Project
//   2. Paste this entire code
//   3. Click Run → select "initialSetup" → Authorize
//   4. Deploy → New deployment → Web app
//      - Execute as: Me
//      - Who has access: Anyone
//   5. Copy the Web App URL → paste into the teacher app config.ts
//   Done!
//
// =====================================================

// Auto-created on first run
let SHEET_ID = '';

function getProps() { return PropertiesService.getScriptProperties(); }

// ==========================================
// INITIAL SETUP — Run this once manually
// ==========================================
function initialSetup() {
  // Create the main attendance sheet
  const ss = SpreadsheetApp.create('Attendance Records');
  const sheet = ss.getSheets()[0];
  sheet.setName('Attendance');
  sheet.getRange(1, 1, 1, 6).setValues([[
    'Email', 'Roll Number', 'Session Name', 'Date', 'Time', 'Timestamp'
  ]]);
  // Auto-size columns
  sheet.setColumnWidth(1, 250);
  sheet.setColumnWidth(2, 120);
  sheet.setColumnWidth(3, 300);
  sheet.setColumnWidth(4, 120);
  sheet.setColumnWidth(5, 100);
  sheet.setColumnWidth(6, 200);
  // Bold header
  sheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
  
  // Create roll map sheet
  const rollSS = SpreadsheetApp.create('Roll Number Map');
  const rollSheet = rollSS.getSheets()[0];
  rollSheet.setName('RollMap');
  rollSheet.getRange(1, 1, 1, 2).setValues([['Email', 'RollNumber']]);
  rollSheet.getRange(2, 1, 2, 2).setValues([
    ['student1@college.edu', '21ME001'],
    ['student2@college.edu', '21ME002'],
  ]);
  rollSheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
  rollSheet.setColumnWidth(1, 250);
  rollSheet.setColumnWidth(2, 120);

  // Save IDs
  const props = getProps();
  props.setProperty('SHEET_ID', ss.getId());
  props.setProperty('ROLL_MAP_ID', rollSS.getId());

  Logger.log('✅ Setup complete!');
  Logger.log('📊 Attendance Sheet: ' + ss.getUrl());
  Logger.log('📋 Roll Map Sheet: ' + rollSS.getUrl());
  Logger.log('');
  Logger.log('👉 Now add your student emails & roll numbers to the Roll Map sheet.');
  Logger.log('👉 Then Deploy this as a Web App and copy the URL to your teacher app.');
}

// ==========================================
// HTTP HANDLERS
// ==========================================

// GET = serve HTML form to students OR handle API calls
function doGet(e) {
  const action = e.parameter.action;
  
  if (action) {
    // API calls from teacher app
    if (action === 'getResponses') return jsonResponse(getResponses(e.parameter.sessionName));
    if (action === 'getStatus') return jsonResponse(getStatus());
    if (action === 'ping') return jsonResponse({ status: 'ok' });
    return jsonResponse({ error: 'Unknown action' });
  }
  
  // Serve attendance form to students
  return serveStudentForm();
}

// POST = handle form submissions OR API calls
function doPost(e) {
  try {
    const contentType = e.postData ? e.postData.type : '';
    
    // Form submission from student
    if (contentType.indexOf('application/x-www-form-urlencoded') >= 0) {
      return handleStudentSubmission(e);
    }
    
    // API call from teacher app (JSON)
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'startSession') return jsonResponse(startSession(data.sessionName));
    if (action === 'stopSession') return jsonResponse(stopSession());
    return jsonResponse({ error: 'Unknown action: ' + action });
    
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// STUDENT FORM — Served as HTML
// ==========================================

function serveStudentForm() {
  const session = getSessionState();
  const isActive = session && session.active;
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Attendance</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: #0f172a;
      color: #f1f5f9;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .card {
      background: #1e293b;
      border-radius: 20px;
      padding: 32px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 8px 32px rgba(99, 102, 241, 0.15);
      border: 1px solid #334155;
    }
    .icon { font-size: 48px; text-align: center; margin-bottom: 16px; }
    h1 { text-align: center; font-size: 24px; margin-bottom: 4px; }
    .session-name {
      text-align: center;
      color: #6366f1;
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 24px;
    }
    .closed-msg {
      text-align: center;
      color: #ef4444;
      font-size: 16px;
      padding: 20px 0;
    }
    .field {
      margin-bottom: 16px;
    }
    label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #cbd5e1;
      margin-bottom: 6px;
    }
    input[type="email"], input[type="text"] {
      width: 100%;
      padding: 14px 16px;
      border-radius: 12px;
      border: 1.5px solid #334155;
      background: #0f172a;
      color: #f1f5f9;
      font-size: 16px;
      outline: none;
      transition: border-color 0.2s;
    }
    input:focus { border-color: #6366f1; }
    .note {
      font-size: 12px;
      color: #64748b;
      margin-top: 4px;
    }
    .btn {
      width: 100%;
      padding: 16px;
      border: none;
      border-radius: 14px;
      background: #6366f1;
      color: white;
      font-size: 17px;
      font-weight: 700;
      cursor: pointer;
      margin-top: 8px;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.9; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .success {
      text-align: center;
      padding: 20px 0;
    }
    .success .check { font-size: 64px; }
    .success h2 { color: #22c55e; margin: 12px 0 4px; }
    .success p { color: #94a3b8; font-size: 14px; }
    #error { color: #ef4444; text-align: center; margin-top: 12px; font-size: 14px; display: none; }
  </style>
</head>
<body>
  <div class="card">
    ${isActive ? \`
      <div class="icon">📋</div>
      <h1>Mark Attendance</h1>
      <div class="session-name">\${escapeHtml(session.sessionName)}</div>
      
      <form id="attendanceForm" onsubmit="return submitForm(event)">
        <div class="field">
          <label>College Email</label>
          <input type="email" id="email" name="email" required 
                 placeholder="yourname@college.edu"
                 pattern=".*@.*\\\\..*">
          <div class="note">Use your official college email</div>
        </div>
        
        <div class="field">
          <label>Full Name</label>
          <input type="text" id="name" name="name" required 
                 placeholder="Your full name">
        </div>
        
        <button type="submit" class="btn" id="submitBtn">✅ Submit Attendance</button>
        <div id="error"></div>
      </form>
      
      <div id="successMsg" style="display:none">
        <div class="success">
          <div class="check">✅</div>
          <h2>Attendance Recorded!</h2>
          <p>Your attendance has been marked for this session.</p>
        </div>
      </div>
    \` : \`
      <div class="icon">🚫</div>
      <h1>Attendance</h1>
      <div class="closed-msg">
        This attendance session is currently closed.<br><br>
        Please wait for your teacher to start a session.
      </div>
    \`}
  </div>

  ${isActive ? \`
  <script>
    function submitForm(e) {
      e.preventDefault();
      var btn = document.getElementById('submitBtn');
      var errDiv = document.getElementById('error');
      btn.disabled = true;
      btn.textContent = '⏳ Submitting...';
      errDiv.style.display = 'none';
      
      var email = document.getElementById('email').value.trim();
      var name = document.getElementById('name').value.trim();
      
      var formData = new URLSearchParams();
      formData.append('email', email);
      formData.append('name', name);
      formData.append('submit', 'true');
      
      fetch(window.location.href, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.success) {
          document.getElementById('attendanceForm').style.display = 'none';
          document.getElementById('successMsg').style.display = 'block';
        } else {
          errDiv.textContent = data.error || 'Submission failed';
          errDiv.style.display = 'block';
          btn.disabled = false;
          btn.textContent = '✅ Submit Attendance';
        }
      })
      .catch(function(err) {
        errDiv.textContent = 'Network error. Please try again.';
        errDiv.style.display = 'block';
        btn.disabled = false;
        btn.textContent = '✅ Submit Attendance';
      });
      
      return false;
    }
  </script>
  \` : ''}
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html)
    .setTitle('Attendance')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ==========================================
// HANDLE STUDENT SUBMISSION
// ==========================================

function handleStudentSubmission(e) {
  const params = e.parameter;
  const email = (params.email || '').trim().toLowerCase();
  const name = (params.name || '').trim();
  
  // Validate
  if (!email || !name) {
    return jsonResponse({ error: 'Email and name are required' });
  }
  
  // Check session is active
  const session = getSessionState();
  if (!session || !session.active) {
    return jsonResponse({ error: 'Session is closed' });
  }
  
  // Check for duplicate submission
  const sheetId = getProps().getProperty('SHEET_ID');
  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheetByName('Attendance');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().toLowerCase() === email && 
        data[i][2] === session.sessionName) {
      return jsonResponse({ error: 'You have already submitted for this session' });
    }
  }
  
  // Look up roll number
  const rollNumber = lookupRollNumber(email);
  
  // Get date/time
  const now = new Date();
  const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  const timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss');
  
  // Append row
  sheet.appendRow([
    email,
    rollNumber,
    session.sessionName,
    dateStr,
    timeStr,
    now.toISOString()
  ]);
  
  return jsonResponse({ success: true, message: 'Attendance recorded' });
}

// ==========================================
// SESSION MANAGEMENT
// ==========================================

function getSessionState() {
  const state = getProps().getProperty('currentSession');
  return state ? JSON.parse(state) : null;
}

function setSessionState(state) {
  if (state) {
    getProps().setProperty('currentSession', JSON.stringify(state));
  } else {
    getProps().deleteProperty('currentSession');
  }
}

function startSession(sessionName) {
  if (!sessionName || sessionName.trim() === '') {
    return { error: 'Session name is required' };
  }
  
  // Verify sheet exists
  const sheetId = getProps().getProperty('SHEET_ID');
  if (!sheetId) {
    return { error: 'Run initialSetup() first from the script editor' };
  }
  
  setSessionState({
    sessionName: sessionName.trim(),
    startedAt: new Date().toISOString(),
    active: true,
  });

  // Get sheet URL
  let sheetUrl = '';
  try {
    sheetUrl = SpreadsheetApp.openById(sheetId).getUrl();
  } catch (e) {
    sheetUrl = 'https://docs.google.com/spreadsheets/d/' + sheetId;
  }

  return {
    success: true,
    sessionName: sessionName.trim(),
    sheetUrl: sheetUrl,
  };
}

function stopSession() {
  const session = getSessionState();
  setSessionState({ ...session, active: false });
  
  return {
    success: true,
    message: 'Session stopped',
    sessionName: session ? session.sessionName : 'unknown',
  };
}

function getStatus() {
  return { session: getSessionState() };
}

function getResponses(sessionFilter) {
  const sheetId = getProps().getProperty('SHEET_ID');
  if (!sheetId) return { error: 'Sheet not set up' };
  
  try {
    const ss = SpreadsheetApp.openById(sheetId);
    const sheet = ss.getSheetByName('Attendance');
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { success: true, headers: data[0] || [], responses: [], count: 0 };
    }
    
    const headers = data[0];
    const sessionCol = headers.indexOf('Session Name');
    const responses = [];
    
    for (let i = 1; i < data.length; i++) {
      if (sessionFilter && sessionCol >= 0 && data[i][sessionCol] !== sessionFilter) {
        continue;
      }
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = data[i][j];
      }
      responses.push(row);
    }
    
    return { success: true, headers: headers, responses: responses, count: responses.length };
  } catch (err) {
    return { error: err.toString() };
  }
}

// ==========================================
// ROLL NUMBER LOOKUP
// ==========================================

function lookupRollNumber(email) {
  try {
    const rollMapId = getProps().getProperty('ROLL_MAP_ID');
    if (!rollMapId) return 'NO MAP';
    
    const ss = SpreadsheetApp.openById(rollMapId);
    const data = ss.getSheets()[0].getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString().toLowerCase().trim() === email) {
        return data[i][1].toString();
      }
    }
    return 'NOT FOUND';
  } catch (err) {
    return 'LOOKUP ERROR';
  }
}

```

### `eas.json`

```json
{
    "cli": {
        "version": ">= 3.0.0"
    },
    "build": {
        "preview": {
            "distribution": "internal",
            "android": {
                "buildType": "apk"
            }
        },
        "production": {
            "android": {
                "buildType": "app-bundle"
            }
        }
    }
}
```

### `index.ts`

```ts
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);

```

### `LICENSE`

```text
All Rights Reserved

Copyright (c) 2026 Ignisight (Anurag Kishan). All rights reserved.

This software and its source code are the exclusive property of the copyright
holder. No part of this software may be reproduced, distributed, modified,
reverse-engineered, or used in any form without prior written permission from
the copyright holder.

Unauthorized copying, distribution, or use of this software, in whole or in
part, is strictly prohibited and may result in legal action.

For licensing inquiries, contact: work.anuragkishan@gmail.com

```

### `package.json`

```json
{
  "name": "attendance-system",
  "version": "2.7.0",
  "main": "index.ts",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "web": "expo start --web"
  },
  "dependencies": {
    "@expo/ngrok": "^4.1.3",
    "@react-native-async-storage/async-storage": "^2.2.0",
    "@react-navigation/native": "^7.1.0",
    "@react-navigation/native-stack": "^7.3.0",
    "expo": "~54.0.33",
    "expo-application": "~7.0.8",
    "expo-camera": "~17.0.10",
    "expo-constants": "~18.0.13",
    "expo-crypto": "~15.0.8",
    "expo-device": "~8.0.10",
    "expo-file-system": "~19.0.21",
    "expo-image-picker": "~17.0.10",
    "expo-keep-awake": "~15.0.8",
    "expo-linear-gradient": "^15.0.8",
    "expo-location": "~19.0.8",
    "expo-sharing": "~14.0.8",
    "expo-status-bar": "~3.0.9",
    "expo-updates": "~29.0.16",
    "react": "19.1.0",
    "react-native": "0.81.5",
    "react-native-qrcode-svg": "^6.3.21",
    "react-native-safe-area-context": "~5.6.0",
    "react-native-screens": "~4.16.0",
    "react-native-svg": "15.12.1",
    "react-native-view-shot": "4.0.3"
  },
  "devDependencies": {
    "@types/react": "~19.1.0",
    "eas-cli": "^18.0.1",
    "typescript": "~5.9.2"
  },
  "private": true
}

```

### `README.md`

```md
# 📱 Nexisight Attendance App (v2.7.0)

A secure, multi-role React Native mobile application for NIT Jamshedpur's QR-based attendance system. Teachers create live sessions with dynamic QR codes, and students scan them to mark attendance. **This version includes hardened security against mock locations and emulators.**

### 📥 Download the App
👉 [Download Latest Official APK (v2.7.0)](https://expo.dev/artifacts/eas/uXhCvXnbFh85MuZcLhNpvA.apk)

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

```

### `setup.js`

```js
/**
 * =============================================
 * Google Attendance System — Automated Setup
 * =============================================
 * 
 * This script automates the entire Google setup:
 * 1. Creates a Google Form template (no questions, collect email, limit 1 response)
 * 2. Creates a Roll Map Google Sheet
 * 3. Creates a Google Drive folder for sessions
 * 4. Creates & deploys a Google Apps Script project
 * 5. Updates config.ts with the deployed URL
 * 
 * HOW TO RUN:
 *   1. Go to https://console.cloud.google.com
 *   2. Create a new project (or select existing)
 *   3. Enable these APIs: Google Forms API, Google Sheets API, Google Drive API, Apps Script API
 *   4. Create OAuth 2.0 credentials (Desktop App type)
 *   5. Download the credentials JSON → save as "credentials.json" in this folder
 *   6. Run: node setup.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { URL } = require('url');

// ==========================================
// CONFIG
// ==========================================
const CREDENTIALS_FILE = path.join(__dirname, 'credentials.json');
const TOKEN_FILE = path.join(__dirname, 'token.json');
const CONFIG_FILE = path.join(__dirname, 'src', 'config.ts');

const SCOPES = [
    'https://www.googleapis.com/auth/forms',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/script.projects',
    'https://www.googleapis.com/auth/script.deployments',
];

// ==========================================
// MAIN
// ==========================================
async function main() {
    console.log('\n🚀 Attendance System — Automated Setup\n');

    // 1. Load credentials
    if (!fs.existsSync(CREDENTIALS_FILE)) {
        console.log('❌ credentials.json not found!\n');
        console.log('Follow these steps to get it:');
        console.log('  1. Go to https://console.cloud.google.com');
        console.log('  2. Create/select a project');
        console.log('  3. Go to "APIs & Services" → "Enabled APIs"');
        console.log('     Enable: Google Forms API, Google Sheets API, Google Drive API, Apps Script API');
        console.log('  4. Go to "APIs & Services" → "Credentials"');
        console.log('  5. Click "+ CREATE CREDENTIALS" → "OAuth client ID"');
        console.log('  6. Application type: "Desktop app"');
        console.log('  7. Download JSON → save as "credentials.json" in:');
        console.log(`     ${__dirname}`);
        console.log('\n  Then re-run: node setup.js\n');
        process.exit(1);
    }

    const creds = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
    const { client_id, client_secret, redirect_uris } = creds.installed || creds.web || {};

    if (!client_id || !client_secret) {
        console.log('❌ Invalid credentials.json format');
        process.exit(1);
    }

    // 2. Get access token
    const token = await getAccessToken(client_id, client_secret);
    console.log('✅ Authenticated with Google\n');

    // 3. Create Drive folder
    console.log('📁 Creating Drive folder...');
    const folderId = await createDriveFolder(token);
    console.log(`   Folder ID: ${folderId}\n`);

    // 4. Create Google Form template
    console.log('📋 Creating Google Form template...');
    const formId = await createFormTemplate(token);
    console.log(`   Form ID: ${formId}\n`);

    // Move form to folder
    await moveToFolder(token, formId, folderId);
    console.log('   ✓ Moved form to folder\n');

    // 5. Create Roll Map Sheet
    console.log('📊 Creating Roll Map Sheet...');
    const rollMapSheetId = await createRollMapSheet(token);
    console.log(`   Sheet ID: ${rollMapSheetId}\n`);

    // Move sheet to folder
    await moveToFolder(token, rollMapSheetId, folderId);
    console.log('   ✓ Moved sheet to folder\n');

    // 6. Create Apps Script project
    console.log('⚡ Creating Apps Script project...');
    const { scriptId, webAppUrl } = await createAppsScript(token, formId, rollMapSheetId, folderId);
    console.log(`   Script ID: ${scriptId}`);
    console.log(`   Web App URL: ${webAppUrl}\n`);

    // 7. Update config.ts
    console.log('⚙️  Updating config.ts...');
    updateConfig(webAppUrl);
    console.log('   ✓ config.ts updated\n');

    // 8. Summary
    console.log('═══════════════════════════════════════');
    console.log('   ✅ SETUP COMPLETE!');
    console.log('═══════════════════════════════════════\n');
    console.log('  Form ID:       ', formId);
    console.log('  Roll Map Sheet:', rollMapSheetId);
    console.log('  Folder ID:     ', folderId);
    console.log('  Script ID:     ', scriptId);
    console.log('  Web App URL:   ', webAppUrl);
    console.log('\n  📱 Next: Run the app with "npx expo start"');
    console.log('  📱 Or build APK: "npx -y eas-cli build -p android --profile preview"\n');
}

// ==========================================
// AUTH — Local OAuth2 flow (opens browser)
// ==========================================
async function getAccessToken(clientId, clientSecret) {
    // Check for cached token
    if (fs.existsSync(TOKEN_FILE)) {
        const cached = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
        if (cached.access_token && cached.expiry && Date.now() < cached.expiry) {
            return cached.access_token;
        }
        // Try refresh
        if (cached.refresh_token) {
            try {
                const refreshed = await refreshToken(clientId, clientSecret, cached.refresh_token);
                return refreshed;
            } catch (e) {
                // Fall through to re-auth
            }
        }
    }

    // Local redirect URI
    const REDIRECT_PORT = 3847;
    const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(SCOPES.join(' '))}` +
        `&access_type=offline` +
        `&prompt=consent`;

    console.log('🔐 Opening browser for Google sign-in...\n');
    console.log('   If the browser doesn\'t open, visit this URL:\n');
    console.log(`   ${authUrl}\n`);

    // Open browser
    const { exec } = require('child_process');
    exec(`start "" "${authUrl}"`);

    // Wait for callback
    const code = await new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
            const code = url.searchParams.get('code');
            if (code) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<html><body style="background:#0f172a;color:#22c55e;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0"><h1>✅ Authenticated! You can close this tab.</h1></body></html>');
                server.close();
                resolve(code);
            } else {
                res.writeHead(400);
                res.end('Missing code parameter');
            }
        });
        server.listen(REDIRECT_PORT, () => {
            console.log('   Waiting for sign-in...');
        });
        server.on('error', reject);
    });

    // Exchange code for token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code',
        }),
    });
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
        throw new Error(`Token error: ${tokenData.error_description || tokenData.error}`);
    }

    // Cache token
    fs.writeFileSync(TOKEN_FILE, JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expiry: Date.now() + (tokenData.expires_in * 1000) - 60000,
    }, null, 2));

    return tokenData.access_token;
}

async function refreshToken(clientId, clientSecret, refreshTok) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshTok,
            grant_type: 'refresh_token',
        }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    fs.writeFileSync(TOKEN_FILE, JSON.stringify({
        access_token: data.access_token,
        refresh_token: refreshTok,
        expiry: Date.now() + (data.expires_in * 1000) - 60000,
    }, null, 2));

    return data.access_token;
}

// ==========================================
// Google Drive — Create Folder
// ==========================================
async function createDriveFolder(token) {
    const res = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: 'Attendance Sessions',
            mimeType: 'application/vnd.google-apps.folder',
        }),
    });
    const data = await res.json();
    if (data.error) throw new Error(JSON.stringify(data.error));
    return data.id;
}

async function moveToFolder(token, fileId, folderId) {
    // Get current parents
    const getRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    const fileData = await getRes.json();
    const previousParents = (fileData.parents || []).join(',');

    // Move to new folder
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${folderId}&removeParents=${previousParents}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
    });
}

// ==========================================
// Google Forms — Create Template
// ==========================================
async function createFormTemplate(token) {
    // Create form
    const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            info: {
                title: 'Attendance',
                documentTitle: 'Attendance',
            },
        }),
    });
    const form = await createRes.json();
    if (form.error) throw new Error(JSON.stringify(form.error));
    const formId = form.formId;

    // Update form description and settings
    await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            requests: [
                {
                    updateFormInfo: {
                        info: {
                            description: 'Submit to mark your attendance',
                        },
                        updateMask: 'description',
                    },
                },
                {
                    updateSettings: {
                        settings: {
                            quizSettings: {
                                isQuiz: false,
                            },
                        },
                        updateMask: 'quizSettings.isQuiz',
                    },
                },
            ],
        }),
    });

    console.log('   ⚠️  NOTE: You must manually enable these Form settings:');
    console.log(`      Open: https://docs.google.com/forms/d/${formId}/edit`);
    console.log('      Settings → Collect email addresses: ON');
    console.log('      Settings → Limit to 1 response: ON');
    console.log('      Settings → Restrict to organization users: ON');

    return formId;
}

// ==========================================
// Google Sheets — Create Roll Map
// ==========================================
async function createRollMapSheet(token) {
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            properties: {
                title: 'Roll Number Map',
            },
            sheets: [{
                properties: {
                    title: 'Sheet1',
                },
                data: [{
                    startRow: 0,
                    startColumn: 0,
                    rowData: [
                        {
                            values: [
                                { userEnteredValue: { stringValue: 'Email' } },
                                { userEnteredValue: { stringValue: 'RollNumber' } },
                            ],
                        },
                        {
                            values: [
                                { userEnteredValue: { stringValue: 'student1@college.edu' } },
                                { userEnteredValue: { stringValue: '21ME001' } },
                            ],
                        },
                        {
                            values: [
                                { userEnteredValue: { stringValue: 'student2@college.edu' } },
                                { userEnteredValue: { stringValue: '21ME002' } },
                            ],
                        },
                    ],
                }],
            }],
        }),
    });
    const sheet = await createRes.json();
    if (sheet.error) throw new Error(JSON.stringify(sheet.error));
    return sheet.spreadsheetId;
}

// ==========================================
// Apps Script — Create & Deploy
// ==========================================
async function createAppsScript(token, templateFormId, rollMapSheetId, folderId) {
    // Read the Code.gs file
    const codeGsPath = path.join(__dirname, 'apps-script', 'Code.gs');
    let codeContent = fs.readFileSync(codeGsPath, 'utf8');

    // Replace placeholder IDs
    codeContent = codeContent.replace('YOUR_TEMPLATE_FORM_ID_HERE', templateFormId);
    codeContent = codeContent.replace('YOUR_ROLL_MAP_SHEET_ID_HERE', rollMapSheetId);
    codeContent = codeContent.replace('YOUR_FOLDER_ID_HERE', folderId);

    // Also save the updated Code.gs
    fs.writeFileSync(codeGsPath, codeContent, 'utf8');
    console.log('   ✓ Updated Code.gs with actual IDs');

    // Create Apps Script project
    const createRes = await fetch('https://script.googleapis.com/v1/projects', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            title: 'Attendance System API',
        }),
    });
    const project = await createRes.json();
    if (project.error) throw new Error(JSON.stringify(project.error));
    const scriptId = project.scriptId;

    // Upload the code
    const updateRes = await fetch(`https://script.googleapis.com/v1/projects/${scriptId}/content`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            files: [
                {
                    name: 'Code',
                    type: 'SERVER_JS',
                    source: codeContent,
                },
                {
                    name: 'appsscript',
                    type: 'JSON',
                    source: JSON.stringify({
                        timeZone: 'Asia/Kolkata',
                        dependencies: {},
                        exceptionLogging: 'STACKDRIVER',
                        runtimeVersion: 'V8',
                        webapp: {
                            executeAs: 'USER_DEPLOYING',
                            access: 'ANYONE_ANONYMOUS',
                        },
                        oauthScopes: [
                            'https://www.googleapis.com/auth/forms',
                            'https://www.googleapis.com/auth/spreadsheets',
                            'https://www.googleapis.com/auth/drive',
                            'https://www.googleapis.com/auth/script.external_request',
                        ],
                    }),
                },
            ],
        }),
    });
    const updateData = await updateRes.json();
    if (updateData.error) throw new Error(JSON.stringify(updateData.error));
    console.log('   ✓ Code uploaded to Apps Script');

    // Deploy as web app
    const deployRes = await fetch(`https://script.googleapis.com/v1/projects/${scriptId}/deployments`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            versionNumber: 1,
            manifestFileName: 'appsscript',
            description: 'Attendance System API v1',
        }),
    });
    const deployment = await deployRes.json();

    // Create a version first if deployment fails
    let webAppUrl = '';
    if (deployment.error) {
        // Create version first
        const versionRes = await fetch(`https://script.googleapis.com/v1/projects/${scriptId}/versions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ description: 'v1' }),
        });
        const version = await versionRes.json();

        // Try deployment again with version
        const retryRes = await fetch(`https://script.googleapis.com/v1/projects/${scriptId}/deployments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                versionNumber: version.versionNumber || 1,
                manifestFileName: 'appsscript',
                description: 'Attendance System API v1',
            }),
        });
        const retryData = await retryRes.json();
        if (retryData.error) {
            console.log('\n   ⚠️  Auto-deployment failed. Deploy manually:');
            console.log(`      Open: https://script.google.com/d/${scriptId}/edit`);
            console.log('      Click Deploy → New deployment → Web App');
            console.log('      Execute as: Me | Access: Anyone');
            console.log('      Copy the URL and paste into src/config.ts\n');
            webAppUrl = `MANUAL_DEPLOY_NEEDED_${scriptId}`;
        } else {
            webAppUrl = retryData.entryPoints?.find(e => e.entryPointType === 'WEB')?.url
                || `https://script.google.com/macros/s/${retryData.deploymentId}/exec`;
        }
    } else {
        webAppUrl = deployment.entryPoints?.find(e => e.entryPointType === 'WEB')?.url
            || `https://script.google.com/macros/s/${deployment.deploymentId}/exec`;
    }

    return { scriptId, webAppUrl };
}

// ==========================================
// Update config.ts
// ==========================================
function updateConfig(webAppUrl) {
    if (webAppUrl.startsWith('MANUAL_DEPLOY_NEEDED')) {
        console.log('   ⚠️  Skipping config update — manual deploy needed');
        return;
    }

    let config = fs.readFileSync(CONFIG_FILE, 'utf8');
    config = config.replace('YOUR_APPS_SCRIPT_WEB_APP_URL_HERE', webAppUrl);
    fs.writeFileSync(CONFIG_FILE, config, 'utf8');
}

// ==========================================
// RUN
// ==========================================
main().catch(err => {
    console.error('\n❌ Setup failed:', err.message || err);
    process.exit(1);
});

```

### `SETUP_GUIDE.md`

```md
# 🚀 Attendance System — Complete Setup Guide

Follow these steps **in order** to get the entire system working.

---

## Step 1: Create the Roll Map Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) → Create a **new blank spreadsheet**
2. Name it: **"Roll Number Map"**
3. In **Row 1**, add headers:
   | A | B |
   |---|---|
   | Email | RollNumber |
4. Fill in student data starting from Row 2:
   | Email | RollNumber |
   |---|---|
   | student1@college.edu | 21ME001 |
   | student2@college.edu | 21ME002 |
5. **Copy the Sheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/THIS_IS_THE_SHEET_ID/edit
   ```

---

## Step 2: Create the Google Form Template

1. Go to [Google Forms](https://forms.google.com) → Create a **new blank form**
2. Set the **title** to: `Attendance`
3. Set the **description** to: `Submit to mark your attendance`
4. **Delete all questions** — the form should have NO questions (submission = present)
5. Go to **Settings** (gear icon) and configure:
   - ✅ **Collect email addresses** → Yes
   - ✅ **Limit to 1 response** → Yes
   - ✅ **Requires sign in** → Yes
   - ✅ **Restrict to users in [your organization]** → Yes (if using Google Workspace)
6. **Copy the Form ID** from the URL:
   ```
   https://docs.google.com/forms/d/THIS_IS_THE_FORM_ID/edit
   ```

---

## Step 3: Create a Google Drive Folder

1. In Google Drive, create a new folder: **"Attendance Sessions"**
2. **Copy the Folder ID** from the URL:
   ```
   https://drive.google.com/drive/folders/THIS_IS_THE_FOLDER_ID
   ```

---

## Step 4: Deploy the Google Apps Script

1. Go to [Google Apps Script](https://script.google.com) → Create a **new project**
2. Name the project: **"Attendance System API"**
3. Delete the default code and paste the **entire contents** of:
   ```
   e:\AG\AttendanceSystem\apps-script\Code.gs
   ```
4. **Update the CONFIG** at the top of the file with your IDs:
   ```javascript
   const CONFIG = {
     TEMPLATE_FORM_ID: 'your_form_id_from_step_2',
     ROLL_MAP_SHEET_ID: 'your_sheet_id_from_step_1',
     FOLDER_ID: 'your_folder_id_from_step_3',
   };
   ```
5. Click **Deploy** → **New deployment**
6. Settings:
   - Type: **Web app**
   - Execute as: **Me** (your account)
   - Who has access: **Anyone**
7. Click **Deploy** → **Authorize access** → Allow all permissions
8. **Copy the Web App URL** (looks like `https://script.google.com/macros/s/.../exec`)

---

## Step 5: Configure the Teacher App

1. Open `e:\AG\AttendanceSystem\src\config.ts`
2. Replace `YOUR_APPS_SCRIPT_WEB_APP_URL_HERE` with the URL from Step 4:
   ```typescript
   export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/.../exec';
   ```
3. Optionally change the teacher PIN (default is `1234`):
   ```typescript
   export const TEACHER_PIN = '1234';
   ```

---

## Step 6: Run the App (Development)

```powershell
cd e:\AG\AttendanceSystem
npx expo start
```

Then scan the QR code with **Expo Go** on your Android phone, or press `a` to open in an Android emulator.

---

## Step 7: Build APK (Production)

### Option A: EAS Build (Recommended — Cloud Build)

```powershell
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build APK
eas build -p android --profile preview
```

> After the build completes (~10 min), download the `.apk` from the link provided.

### Option B: Local Build (No Expo Account Needed)

```powershell
# Create the Android build locally
npx expo prebuild --platform android
cd android
.\gradlew.bat assembleRelease
```

The APK will be at: `android\app\build\outputs\apk\release\app-release.apk`

---

## Step 8: Test the Full Flow

1. ✅ Open the app → Login with PIN `1234`
2. ✅ Enter a session name (e.g., "Test Session")
3. ✅ Tap "Start Attendance" → QR code appears
4. ✅ Scan QR with another phone → Google Form opens
5. ✅ Sign in with college Gmail → Submit
6. ✅ Check "View Responses" in app → student should appear
7. ✅ Check "Open Live Sheet" → Google Sheet should have all columns filled
8. ✅ Tap "Export Excel" → `.xlsx` file downloads
9. ✅ Wait for timer or tap "Terminate" → form stops accepting responses

---

## Troubleshooting

| Issue | Solution |
|---|---|
| "Connection Error" when starting session | Check that `APPS_SCRIPT_URL` in config.ts is correct |
| Form doesn't require sign-in | Re-check Form Settings → Require sign in → ON |
| Roll Number shows "NOT FOUND" | Add the student's email to the Roll Map sheet |
| Apps Script authorization error | Re-deploy and re-authorize permissions |
| QR code not scannable | Increase screen brightness, ensure phone camera can focus |

```

### `src/api.ts`

```ts
import { DEFAULT_SERVER_URL, APP_SECRET_HEADER } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

let SERVER_URL = DEFAULT_SERVER_URL;

export function setServerUrl(url: string) {
    SERVER_URL = url.replace(/\/+$/, '');
}

export function getServerUrl() {
    return SERVER_URL;
}

// Register
export const register = async (name: string, email: string, password: string, college: string, department: string, allowedDomain?: string) => {
    try {
        const response = await fetch(`${SERVER_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...APP_SECRET_HEADER },
            body: JSON.stringify({ name, email, password, college, department, allowedDomain }),
        });
        return await response.json();
    } catch (error) {
        console.error("Register Error:", error);
        return { success: false, error: "Network error" };
    }
};

// Login
export const login = async (email: string, password: string) => {
    try {
        const response = await fetch(`${SERVER_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...APP_SECRET_HEADER },
            body: JSON.stringify({ email, password }),
        });
        return await response.json();
    } catch (error) {
        console.error("Login Error:", error);
        return { success: false, error: "Network error" };
    }
};

export async function forgotPassword(email: string) {
    const res = await fetch(`${SERVER_URL}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...APP_SECRET_HEADER },
        body: JSON.stringify({ email }),
    });
    return await res.json();
}

export async function resetPassword(email: string, otp: string, newPassword: string) {
    const res = await fetch(`${SERVER_URL}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...APP_SECRET_HEADER },
        body: JSON.stringify({ email, otp, newPassword }),
    });
    return await res.json();
}

// Change Password
export const changePassword = async (email: string, currentPassword: string, newPassword: string) => {
    try {
        const response = await fetch(`${SERVER_URL}/api/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...APP_SECRET_HEADER },
            body: JSON.stringify({ email, currentPassword, newPassword }),
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: "Network error" };
    }
};

// Update Profile
export const updateProfile = async (email: string, name: string, college: string, department: string, allowedDomain: string) => {
    try {
        const response = await fetch(`${SERVER_URL}/api/update-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...APP_SECRET_HEADER },
            body: JSON.stringify({ email, name, college, department, allowedDomain }),
        });
        return await response.json();
    } catch (error) {
        console.error("Update Profile Error:", error);
        return { success: false, error: "Network error" };
    }
};

// ==========================================
// ATTENDANCE
// ==========================================

export async function startSession(sessionName: string, lat?: number, lon?: number, teacherEmail?: string) {
    const res = await fetch(`${SERVER_URL}/api/start-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...APP_SECRET_HEADER },
        body: JSON.stringify({ sessionName, lat, lon, teacherEmail }),
    });
    return await res.json();
}

export async function stopSession(sessionId?: number) {
    let url = `${SERVER_URL}/api/stop-session`;
    if (sessionId) url = `${SERVER_URL}/api/sessions/${sessionId}/stop`;

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...APP_SECRET_HEADER },
    });
    return await res.json();
}

export async function getResponses(sessionId?: number) {
    let url = `${SERVER_URL}/api/responses`;
    if (sessionId) {
        url += `?sessionId=${encodeURIComponent(sessionId)}`;
    }
    const res = await fetch(url, { headers: APP_SECRET_HEADER });
    return await res.json();
}

export async function pingServer(url: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`${url.replace(/\/+$/, '')}/api/status`, {
            headers: APP_SECRET_HEADER,
            signal: controller.signal,
        });
        clearTimeout(timeout);
        return res.ok;
    } catch {
        return false;
    }
}

// ==========================================
// PERSISTENCE
// ==========================================

const USER_KEY = 'attendance_user_data';

export async function saveUser(user: any) {
    try {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) {
        console.error('Failed to save user', e);
    }
}

export async function getUser() {
    try {
        const json = await AsyncStorage.getItem(USER_KEY);
        return json != null ? JSON.parse(json) : null;
    } catch (e) {
        console.error('Failed to load user', e);
        return null;
    }
}

export async function clearUser() {
    try {
        await AsyncStorage.removeItem(USER_KEY);
    } catch (e) {
        console.error('Failed to clear user', e);
    }
}

```

### `src/config.ts`

```ts
// ==========================================
// Configuration
// ==========================================
import Constants from 'expo-constants';

// Server URL — your deployed Render server (Production)
export const DEFAULT_SERVER_URL = 'https://attendance-server-ddgs.onrender.com';

// Security: App Secret Key injected at build time via app.config.js
// NEVER hardcode the actual key here — it comes from environment variables
export const APP_SECRET_KEY = Constants.expoConfig?.extra?.APP_SECRET_KEY || '';
export const APP_SECRET_HEADER = { 'x-app-secret': APP_SECRET_KEY };

// Session duration in milliseconds (10 minutes)
export const SESSION_DURATION_MS = 10 * 60 * 1000;

// Auto-refresh interval for live responses (seconds)
export const REFRESH_INTERVAL_SEC = 10;

```

### `src/screens/ForgotPasswordScreen.tsx`

```tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { forgotPassword, resetPassword } from '../api';

interface ForgotPasswordScreenProps {
    navigation: any;
}

export default function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
    const [step, setStep] = useState<'email' | 'otp'>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleSendOtp = async () => {
        if (!email.trim()) {
            Alert.alert('Required', 'Please enter your email.');
            return;
        }

        setLoading(true);
        try {
            const result = await forgotPassword(email.trim());
            if (result.success) {
                setStep('otp');
                Alert.alert('OTP Sent ✅', 'Check your email for the 6-digit code.');
            } else {
                Alert.alert('Error', result.error || 'Could not send OTP');
            }
        } catch (err: any) {
            Alert.alert('Connection Error', 'Cannot reach the server.');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        if (!otp || !newPassword || !confirmPassword) {
            Alert.alert('Required', 'Please fill in all fields.');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Mismatch', 'Passwords do not match.');
            return;
        }

        if (newPassword.length < 4) {
            Alert.alert('Too Short', 'Password must be at least 4 characters.');
            return;
        }

        setLoading(true);
        try {
            const result = await resetPassword(email.trim(), otp, newPassword);
            if (result.success) {
                Alert.alert('Password Reset! ✅', 'You can now login with your new password.', [
                    { text: 'Go to Login', onPress: () => navigation.navigate('Login') },
                ]);
            } else {
                Alert.alert('Error', result.error || 'Reset failed');
            }
        } catch (err: any) {
            Alert.alert('Connection Error', 'Cannot reach the server.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>

                <View style={styles.logoContainer}>
                    <Text style={styles.icon}>🔒</Text>
                    <Text style={styles.title}>
                        {step === 'email' ? 'Forgot Password' : 'Reset Password'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {step === 'email'
                            ? 'Enter your email to get a reset code'
                            : 'Enter the OTP and your new password'}
                    </Text>
                </View>

                {step === 'email' ? (
                    <>
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="you@college.edu"
                                placeholderTextColor="#475569"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                editable={!loading}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.actionBtn, loading && styles.actionBtnDisabled]}
                            onPress={handleSendOtp}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <View style={styles.row}>
                                    <ActivityIndicator color="#fff" size="small" />
                                    <Text style={styles.actionBtnText}>  Sending...</Text>
                                </View>
                            ) : (
                                <Text style={styles.actionBtnText}>Send OTP</Text>
                            )}
                        </TouchableOpacity>
                    </>
                ) : (
                    <>

                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>OTP Code</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="6-digit code"
                                placeholderTextColor="#475569"
                                value={otp}
                                onChangeText={setOtp}
                                keyboardType="number-pad"
                                maxLength={6}
                                editable={!loading}
                            />
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>New Password</Text>
                            <View style={styles.passwordRow}>
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Min 4 characters"
                                    placeholderTextColor="#475569"
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    secureTextEntry={!showPassword}
                                    editable={!loading}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                                    <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Confirm Password</Text>
                            <View style={styles.passwordRow}>
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Re-enter password"
                                    placeholderTextColor="#475569"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showConfirm}
                                    editable={!loading}
                                />
                                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                                    <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁️'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.actionBtn, loading && styles.actionBtnDisabled]}
                            onPress={handleReset}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <View style={styles.row}>
                                    <ActivityIndicator color="#fff" size="small" />
                                    <Text style={styles.actionBtnText}>  Resetting...</Text>
                                </View>
                            ) : (
                                <Text style={styles.actionBtnText}>Reset Password</Text>
                            )}
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    inner: { padding: 28, paddingTop: 56, paddingBottom: 40 },
    backBtn: { marginBottom: 20 },
    backText: { color: '#94a3b8', fontSize: 16, fontWeight: '600' },
    logoContainer: { alignItems: 'center', marginBottom: 32 },
    icon: { fontSize: 48, marginBottom: 12 },
    title: { fontSize: 26, fontWeight: '800', color: '#f1f5f9' },
    subtitle: { fontSize: 14, color: '#64748b', marginTop: 6, textAlign: 'center' },
    fieldGroup: { marginBottom: 18 },
    label: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: {
        width: '100%', backgroundColor: '#1e293b', borderRadius: 14,
        paddingHorizontal: 18, paddingVertical: 15,
        fontSize: 16, color: '#f1f5f9',
        borderWidth: 1.5, borderColor: '#334155',
    },
    actionBtn: {
        backgroundColor: '#6366f1', paddingVertical: 17,
        borderRadius: 14, alignItems: 'center', marginTop: 8,
        shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
    },
    actionBtnDisabled: { opacity: 0.6 },
    actionBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
    row: { flexDirection: 'row', alignItems: 'center' },
    passwordRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#1e293b', borderRadius: 14,
        borderWidth: 1.5, borderColor: '#334155',
    },
    passwordInput: {
        flex: 1, paddingHorizontal: 18, paddingVertical: 15,
        fontSize: 16, color: '#f1f5f9',
    },
    eyeBtn: { paddingHorizontal: 14, paddingVertical: 12 },
    eyeIcon: { fontSize: 20 },
    otpHint: {
        backgroundColor: '#1e293b', borderRadius: 14, padding: 16,
        marginBottom: 20, alignItems: 'center',
        borderWidth: 1.5, borderColor: '#22c55e',
    },
    otpHintLabel: { fontSize: 13, color: '#94a3b8', marginBottom: 8 },
    otpHintCode: { fontSize: 32, fontWeight: '800', color: '#22c55e', letterSpacing: 8 },
});

```

### `src/screens/HistoryScreen.tsx`

```tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServerUrl } from '../api';
import { APP_SECRET_HEADER, APP_SECRET_KEY } from '../config';

interface HistoryScreenProps {
    navigation: any;
}

interface SessionItem {
    id: number;
    name: string;
    createdAt: string;
    stoppedAt: string | null;
    active: boolean;
    responseCount: number;
}

export default function HistoryScreen({ navigation }: HistoryScreenProps) {
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [actionLoading, setActionLoading] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const [now, setNow] = useState(Date.now());
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const serverUrl = getServerUrl();
            const res = await fetch(`${serverUrl}/api/history`, { headers: APP_SECRET_HEADER });
            const data = await res.json();
            if (data.success) {
                setSessions(data.sessions);
            }
        } catch (err: any) {
            Alert.alert('Error', 'Could not fetch session history.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchHistory(); }, []);

    // Update elapsed time every second for active sessions
    useEffect(() => {
        const hasActive = sessions.some(s => s.active);
        if (hasActive) {
            timerRef.current = setInterval(() => setNow(Date.now()), 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [sessions]);

    const formatDateTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: '2-digit',
        }) + ' • ' + d.toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
        });
    };

    const formatDuration = (start: string, end: string | null, active: boolean) => {
        let endMs;
        if (end) {
            endMs = new Date(end).getTime();
        } else if (active) {
            endMs = now;
        } else {
            endMs = new Date(start).getTime() + 10 * 60 * 1000; // 10m fallback for legacy
        }

        let ms = endMs - new Date(start).getTime();

        // Cap the live active timer to EXACTLY 10 minutes if the user hasn't pulled to refresh yet
        if (active && ms > 10 * 60 * 1000) {
            ms = 10 * 60 * 1000;
        }

        const totalSec = Math.floor(ms / 1000);
        const hrs = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;
        if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
        if (mins > 0) return `${mins}m ${secs}s`;
        return `${secs}s`;
    };

    const stopSession = (item: SessionItem) => {
        Alert.alert(
            'Stop Session',
            `Stop "${item.name}"? Students will no longer be able to submit.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Stop', style: 'destructive', onPress: async () => {
                        setActionLoading(true);
                        try {
                            const serverUrl = getServerUrl();
                            await fetch(`${serverUrl}/api/sessions/${item.id}/stop`, { method: 'POST', headers: APP_SECRET_HEADER });
                            await fetchHistory();
                        } catch {
                            Alert.alert('Error', 'Failed to stop session.');
                        } finally {
                            setActionLoading(false);
                        }
                    }
                },
            ]
        );
    };

    const toggleSelect = (id: number) => {
        const newSet = new Set(selected);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelected(newSet);
    };

    const selectAll = () => {
        if (selected.size === sessions.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(sessions.map(s => s.id)));
        }
    };

    const exitSelectMode = () => {
        setSelectMode(false);
        setSelected(new Set());
    };

    const handleDeleteSelected = () => {
        if (selected.size === 0) return;
        Alert.alert(
            'Delete Sessions',
            `Delete ${selected.size} selected session(s) and all their data?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive', onPress: async () => {
                        setActionLoading(true);
                        try {
                            const serverUrl = getServerUrl();
                            await fetch(`${serverUrl}/api/sessions/delete-many`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', ...APP_SECRET_HEADER },
                                body: JSON.stringify({ ids: Array.from(selected) }),
                            });
                            exitSelectMode();
                            await fetchHistory();
                        } catch (err) {
                            Alert.alert('Error', 'Failed to delete sessions.');
                        } finally {
                            setActionLoading(false);
                        }
                    }
                },
            ]
        );
    };

    const handleClearAll = () => {
        Alert.alert(
            'Clear All Sessions',
            'Delete ALL sessions and attendance data? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All', style: 'destructive', onPress: async () => {
                        setActionLoading(true);
                        try {
                            const serverUrl = getServerUrl();
                            await fetch(`${serverUrl}/api/sessions/clear-all`, { method: 'POST', headers: APP_SECRET_HEADER });
                            exitSelectMode();
                            await fetchHistory();
                        } catch (err) {
                            Alert.alert('Error', 'Failed to clear sessions.');
                        } finally {
                            setActionLoading(false);
                        }
                    }
                },
            ]
        );
    };

    const handleExportSelected = async (action: 'download' | 'export') => {
        setActionLoading(true);
        setMenuVisible(false);
        try {
            const serverUrl = getServerUrl();
            const targetIds = selected.size > 0 ? Array.from(selected) : sessions.map(s => s.id);
            const totalCount = targetIds.length;

            if (totalCount === 0) {
                Alert.alert('No sessions found.');
                return;
            }

            const isMulti = totalCount > 1;
            let url: string;
            let fileName: string;
            let mimeType: string;

            if (isMulti) {
                // Determine ZIP filename based on subject selection
                const targetSessions = sessions.filter(s => targetIds.includes(s.id));
                const uniqueNames = [...new Set(targetSessions.map(s => s.name))];
                
                if (uniqueNames.length === 1) {
                    const safeSubject = uniqueNames[0].replace(/[^a-zA-Z0-9]/g, '_');
                    fileName = `attendance_${safeSubject}_sessions.zip`;
                } else {
                    fileName = `attendance_sessions_${Date.now()}.zip`;
                }
                
                mimeType = 'application/zip';
                const ids = targetIds.join(',');
                url = `${serverUrl}/api/export-multi?ids=${ids}&key=${encodeURIComponent(APP_SECRET_KEY)}`;
            } else {
                const s = sessions.find(item => item.id === targetIds[0]);
                if (!s) return;
                
                const safeName = s.name.replace(/[^a-zA-Z0-9]/g, '_');
                const d = new Date(s.createdAt);
                const dd = String(d.getDate()).padStart(2, '0');
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const yyyy = d.getFullYear();
                let hh = d.getHours();
                const min = String(d.getMinutes()).padStart(2, '0');
                const ampm = hh >= 12 ? 'PM' : 'AM';
                hh = hh % 12 || 12;
                const hhStr = String(hh).padStart(2, '0');

                fileName = `attendance_${safeName}_${dd}-${mm}-${yyyy}_${hhStr}-${min}${ampm}.xlsx`;
                mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                url = `${serverUrl}/api/export?sessionId=${targetIds[0]}&key=${encodeURIComponent(APP_SECRET_KEY)}`;
            }

            const filePath = `${FileSystem.documentDirectory}${fileName}`;
            const downloadResult = await FileSystem.downloadAsync(url, filePath);

            if (action === 'export') {
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(downloadResult.uri, {
                        mimeType,
                        dialogTitle: `Export ${fileName}`,
                    });
                }
            } else {
                if (Platform.OS === 'android') {
                    let directoryUri = await AsyncStorage.getItem('savedExportDirectory');
                    const base64Data = await FileSystem.readAsStringAsync(downloadResult.uri, { encoding: FileSystem.EncodingType.Base64 });

                    if (directoryUri) {
                        try {
                            const newUri = await FileSystem.StorageAccessFramework.createFileAsync(directoryUri, fileName, mimeType);
                            await FileSystem.writeAsStringAsync(newUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
                        } catch (e) {
                            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                            if (permissions.granted) {
                                await AsyncStorage.setItem('savedExportDirectory', permissions.directoryUri);
                                const newUri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, fileName, mimeType);
                                await FileSystem.writeAsStringAsync(newUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
                            }
                        }
                    } else {
                        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                        if (permissions.granted) {
                            await AsyncStorage.setItem('savedExportDirectory', permissions.directoryUri);
                            const newUri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, fileName, mimeType);
                            await FileSystem.writeAsStringAsync(newUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
                        }
                    }
                } else {
                    if (await Sharing.isAvailableAsync()) {
                        await Sharing.shareAsync(downloadResult.uri, { mimeType, dialogTitle: 'Save Attendance' });
                    }
                }
            }

            if (action === 'download') {
                Alert.alert('Success', isMulti ? 'ZIP archive saved!' : 'File saved!');
            }
        } catch (err: any) {
            Alert.alert('Download Error', err.message || 'Failed to download');
        } finally {
            setActionLoading(false);
        }
    };

    const viewResponses = (sessionId: number, sessionName: string) => {
        if (selectMode) return;
        navigation.navigate('Responses', { sessionId, sessionName });
    };

    const handleLongPress = (id: number) => {
        if (!selectMode) {
            setSelectMode(true);
            setSelected(new Set([id]));
        }
    };

    const renderItem = ({ item }: { item: SessionItem }) => {
        const isSelected = selected.has(item.id);
        const elapsedLocalMs = now - new Date(item.createdAt).getTime();
        const isEffectivelyActive = item.active && elapsedLocalMs <= 10 * 60 * 1000;

        let displayStoppedAt = item.stoppedAt;
        if (!isEffectivelyActive && item.active && !item.stoppedAt) {
            // It just crossed 10 mins locally but hasn't synced with server yet. Inject visually.
            displayStoppedAt = new Date(new Date(item.createdAt).getTime() + 10 * 60 * 1000).toISOString();
        }

        return (
            <TouchableOpacity
                style={[
                    styles.card,
                    isEffectivelyActive && styles.cardActive,
                    isSelected && styles.cardSelected,
                ]}
                onPress={() => selectMode ? toggleSelect(item.id) : viewResponses(item.id, item.name)}
                onLongPress={() => handleLongPress(item.id)}
                activeOpacity={0.7}
            >
                {/* Header row */}
                <View style={styles.cardTop}>
                    {selectMode ? (
                        <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                            {isSelected && <Text style={styles.checkboxIcon}>✓</Text>}
                        </View>
                    ) : (
                        <View style={[styles.statusDot, isEffectivelyActive && styles.statusDotActive]} />
                    )}
                    <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
                    {isEffectivelyActive && !selectMode && (
                        <TouchableOpacity
                            style={styles.stopBtn}
                            onPress={() => stopSession(item)}
                        >
                            <Text style={styles.stopBtnText}>⏹ Stop</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Date/Time info */}
                <View style={styles.timeRow}>
                    <Text style={styles.timeLabel}>🟢 Start:</Text>
                    <Text style={styles.timeValue}>{formatDateTime(item.createdAt)}</Text>
                </View>
                {displayStoppedAt ? (
                    <View style={styles.timeRow}>
                        <Text style={styles.timeLabel}>🔴 End:</Text>
                        <Text style={styles.timeValue}>{formatDateTime(displayStoppedAt)}</Text>
                    </View>
                ) : isEffectivelyActive ? (
                    <View style={styles.timeRow}>
                        <Text style={[styles.timeLabel, { color: '#22c55e' }]}>⏳ Running</Text>
                    </View>
                ) : null}

                <View style={styles.cardBottom}>
                    <View style={styles.chip}>
                        <Text style={styles.chipText}>👥 {item.responseCount}</Text>
                    </View>
                    <View style={[styles.chip, isEffectivelyActive && { backgroundColor: '#052e16', borderWidth: 1, borderColor: '#22c55e40' }]}>
                        <Text style={[styles.chipText, isEffectivelyActive && { color: '#4ade80' }]}>
                            ⏱ {formatDuration(item.createdAt, displayStoppedAt, isEffectivelyActive)}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.loadingText}>Loading history...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => selectMode ? exitSelectMode() : navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>{selectMode ? '✕ Cancel' : '← Back'}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>
                    {selectMode ? `${selected.size} Selected` : 'Session History'}
                </Text>
                {!selectMode ? (
                    <TouchableOpacity onPress={fetchHistory} style={styles.refreshBtn}>
                        <Text style={styles.refreshText}>🔄</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={selectAll} style={styles.refreshBtn}>
                        <Text style={styles.refreshText}>
                            {selected.size === sessions.length ? '☐' : '☑'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {!selectMode && (
                <Text style={styles.retentionNote}>📌 Sessions stored for 2 days • Long-press to select</Text>
            )}

            {sessions.length === 0 ? (
                <View style={styles.emptyBox}>
                    <Text style={styles.emptyIcon}>📭</Text>
                    <Text style={styles.emptyTitle}>No sessions yet</Text>
                    <Text style={styles.emptyDesc}>Start an attendance session from the home screen.</Text>
                </View>
            ) : (
                <FlatList
                    data={sessions}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    extraData={now}
                />
            )}

            {/* Bottom Action Bar */}
            {sessions.length > 0 && (
                <View style={styles.bottomBarWrapper}>
                    {menuVisible && (
                        <View style={styles.menuContainer}>
                            <TouchableOpacity style={styles.menuItem} onPress={() => handleExportSelected('download')}>
                                <Text style={styles.menuItemText}>📥  Download</Text>
                            </TouchableOpacity>
                            <View style={styles.menuDivider} />
                            <TouchableOpacity style={styles.menuItem} onPress={() => handleExportSelected('export')}>
                                <Text style={styles.menuItemText}>📤  Export</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    <View style={styles.bottomBar}>
                        {actionLoading ? (
                            <View style={styles.actionLoading}>
                                <ActivityIndicator color="#6366f1" size="small" />
                                <Text style={styles.actionLoadingText}>  Processing...</Text>
                            </View>
                        ) : selectMode ? (
                            <>
                                <TouchableOpacity
                                    style={[styles.bottomBtn, styles.exportBtn, { opacity: selected.size === 0 ? 0.5 : 1 }]}
                                    onPress={() => setMenuVisible(!menuVisible)}
                                    disabled={selected.size === 0}
                                >
                                    <Text style={styles.bottomBtnText}>📥 Download ▲</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.bottomBtn, styles.deleteBtn, { opacity: selected.size === 0 ? 0.5 : 1 }]}
                                    onPress={handleDeleteSelected}
                                    disabled={selected.size === 0}
                                >
                                    <Text style={styles.deleteBtnText}>🗑 Delete ({selected.size})</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <TouchableOpacity
                                    style={[styles.bottomBtn, styles.exportBtn]}
                                    onPress={() => setMenuVisible(!menuVisible)}
                                >
                                    <Text style={styles.bottomBtnText}>📥 Download ▲</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.bottomBtn, styles.clearBtn]}
                                    onPress={handleClearAll}
                                >
                                    <Text style={styles.clearBtnText}>🗑 Clear All</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a', paddingTop: 56 },
    centered: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#94a3b8', marginTop: 12, fontSize: 15 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 4 },
    backBtn: { padding: 8, marginRight: 8 },
    backText: { color: '#94a3b8', fontSize: 16, fontWeight: '600' },
    title: { flex: 1, fontSize: 22, fontWeight: '700', color: '#f1f5f9' },
    refreshBtn: { padding: 8 },
    refreshText: { fontSize: 20 },
    retentionNote: {
        fontSize: 12, color: '#f59e0b', paddingHorizontal: 28, marginBottom: 16,
        backgroundColor: 'rgba(245, 158, 11, 0.08)', marginHorizontal: 20,
        paddingVertical: 8, borderRadius: 8, textAlign: 'center',
    },
    listContent: { paddingHorizontal: 20, paddingBottom: 100 },
    card: {
        backgroundColor: '#1e293b', borderRadius: 16, padding: 18,
        marginBottom: 10, borderWidth: 1.5, borderColor: '#334155',
    },
    cardActive: { borderColor: '#22c55e', backgroundColor: '#052e16' },
    cardSelected: { borderColor: '#6366f1', backgroundColor: '#1e1b4b' },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 10 },
    statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#475569', marginTop: 5 },
    statusDotActive: { backgroundColor: '#22c55e' },
    checkbox: {
        width: 22, height: 22, borderRadius: 6, borderWidth: 2,
        borderColor: '#475569', justifyContent: 'center', alignItems: 'center', marginTop: 1,
    },
    checkboxChecked: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
    checkboxIcon: { color: '#fff', fontSize: 14, fontWeight: '700' },
    cardName: { flex: 1, fontSize: 16, fontWeight: '600', color: '#f1f5f9', lineHeight: 22 },

    // Stop button for active sessions
    stopBtn: {
        backgroundColor: '#dc2626', paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 8,
    },
    stopBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

    // Time rows
    timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, paddingLeft: 20 },
    timeLabel: { fontSize: 12, color: '#64748b', fontWeight: '600', width: 70 },
    timeValue: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },

    cardBottom: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', gap: 8, marginTop: 8 },
    chip: { backgroundColor: '#0f172a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    chipText: { fontSize: 13, fontWeight: '600', color: '#cbd5e1' },
    emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#e2e8f0', marginBottom: 4 },
    emptyDesc: { fontSize: 14, color: '#64748b', textAlign: 'center' },

    // Bottom bar
    bottomBarWrapper: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
    },
    menuContainer: {
        backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155',
        marginHorizontal: 20, marginBottom: 10, padding: 8,
    },
    menuItem: { paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' },
    menuDivider: { height: 1, backgroundColor: '#334155', marginHorizontal: 8 },
    menuItemText: { color: '#f1f5f9', fontSize: 16, fontWeight: '600' },
    bottomBar: {
        flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 16,
        backgroundColor: '#0f172a', borderTopWidth: 1, borderTopColor: '#1e293b',
    },
    bottomBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    exportBtn: { backgroundColor: '#059669' },
    bottomBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    deleteBtn: { backgroundColor: '#450a0a', borderWidth: 1, borderColor: '#dc2626' },
    deleteBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '700' },
    clearBtn: { backgroundColor: '#450a0a', borderWidth: 1, borderColor: '#dc2626' },
    clearBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '700' },
    actionLoading: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14 },
    actionLoadingText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
});

```

### `src/screens/HomeScreen.tsx`

```tsx
import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView,
    Animated,
    Dimensions,
} from 'react-native';
import { startSession, getServerUrl, clearUser } from '../api';
import * as Location from 'expo-location';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.82;

interface HomeScreenProps {
    navigation: any;
    route: any;
}

export default function HomeScreen({ navigation, route }: HomeScreenProps) {
    const { userName, userEmail, userCollege, userDepartment, userAllowedDomain } = route.params || {};
    const [sessionName, setSessionName] = useState('');
    const [loading, setLoading] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const overlayAnim = useRef(new Animated.Value(0)).current;

    const openDrawer = () => {
        setDrawerOpen(true);
        Animated.parallel([
            Animated.spring(drawerAnim, { toValue: 0, useNativeDriver: true, damping: 20 }),
            Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();
    };

    const closeDrawer = () => {
        Animated.parallel([
            Animated.spring(drawerAnim, { toValue: -DRAWER_WIDTH, useNativeDriver: true, damping: 20 }),
            Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => setDrawerOpen(false));
    };

    const handleLogout = async () => {
        await clearUser();
        closeDrawer();
        setTimeout(() => navigation.replace('Login'), 300);
    };

    const openHistory = () => {
        closeDrawer();
        setTimeout(() => navigation.navigate('History'), 300);
    };

    const openSettings = () => {
        closeDrawer();
        setTimeout(() => navigation.navigate('Settings', {
            userName, userEmail, userCollege, userDepartment, userAllowedDomain,
        }), 300);
    };

    const handleStart = async () => {
        const trimmed = sessionName.trim();
        if (!trimmed) { Alert.alert('Required', 'Please enter a session name.'); return; }

        setLoading(true);
        try {
            // 1. Try to get GPS with strict 5-second timeout
            let latitude, longitude;

            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    // Race: GPS vs 5-second timeout
                    const locationPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('GPS timeout')), 5000));

                    const location: any = await Promise.race([locationPromise, timeoutPromise]);
                    latitude = location.coords.latitude;
                    longitude = location.coords.longitude;
                }
            } catch (locErr) {
                // GPS failed or timed out — continue without it
                console.log('GPS skipped:', locErr);
            }

            // 2. Start Session (with or without coords)
            try {
                const result = await startSession(trimmed, latitude, longitude, userEmail);
                if (result.error) { Alert.alert('Error', result.error); return; }
                if (result.success) {
                    navigation.navigate('Session', {
                        sessionName: trimmed,
                        formUrl: result.formUrl,
                        sessionId: result.sessionId,
                    });
                    setSessionName('');
                }
            } catch (serverErr) {
                Alert.alert('Connection Error', 'Could not reach the server. Check Settings → Server URL.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={openDrawer} style={styles.menuBtn}>
                        <Text style={styles.menuIcon}>☰</Text>
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.greeting}>👋 Hi, {userName || 'Teacher'}</Text>
                        <Text style={styles.subGreeting}>{userCollege || 'NIT Jamshedpur'}</Text>
                    </View>
                </View>

                {/* Start Attendance Card */}
                <View style={styles.card}>
                    <View style={styles.cardIcon}>
                        <Text style={styles.cardIconText}>🎓</Text>
                    </View>
                    <Text style={styles.cardTitle}>Start Attendance</Text>
                    <Text style={styles.cardDesc}>
                        Enter a session name and tap Start. Students scan the QR to submit attendance.
                    </Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Session Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder='e.g. "MECH 6th Sem – Thermo – P3"'
                            placeholderTextColor="#64748b"
                            value={sessionName}
                            onChangeText={setSessionName}
                            editable={!loading}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.startBtn, (!sessionName.trim() || loading) && styles.startBtnDisabled]}
                        onPress={handleStart}
                        disabled={!sessionName.trim() || loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator color="#fff" size="small" />
                                <Text style={styles.startBtnText}>  Starting...</Text>
                            </View>
                        ) : (
                            <Text style={styles.startBtnText}>▶  Start Attendance</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Quick Actions */}
                <View style={styles.infoRow}>
                    <TouchableOpacity style={styles.infoCard} onPress={openHistory}>
                        <Text style={styles.infoIcon}>📊</Text>
                        <Text style={styles.infoTitle}>History</Text>
                        <Text style={styles.infoDesc}>Past 2 days records</Text>
                    </TouchableOpacity>
                    <View style={styles.infoCard}>
                        <Text style={styles.infoIcon}>☁️</Text>
                        <Text style={styles.infoTitle}>Cloud Server</Text>
                        <Text style={styles.infoDesc}>Always available</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Drawer */}
            {drawerOpen && (
                <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                    <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
                        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDrawer} />
                    </Animated.View>

                    <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
                        <ScrollView contentContainerStyle={styles.drawerContent}>
                            {/* Profile Header */}
                            <View style={styles.profileCard}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>
                                        {(userName || 'T').charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                                <Text style={styles.profileName}>{userName || 'Teacher'}</Text>
                                <Text style={styles.profileEmail}>{userEmail || ''}</Text>
                                <View style={styles.profileMeta}>
                                    {userCollege ? (
                                        <View style={styles.metaRow}>
                                            <Text style={styles.metaIcon}>🏛️</Text>
                                            <Text style={styles.metaText}>{userCollege}</Text>
                                        </View>
                                    ) : null}
                                    {userDepartment ? (
                                        <View style={styles.metaRow}>
                                            <Text style={styles.metaIcon}>📚</Text>
                                            <Text style={styles.metaText}>{userDepartment}</Text>
                                        </View>
                                    ) : null}
                                </View>
                            </View>

                            <View style={styles.divider} />

                            {/* Menu Items */}
                            <TouchableOpacity style={styles.menuItem} onPress={openHistory}>
                                <Text style={styles.menuItemIcon}>📊</Text>
                                <View style={styles.menuItemContent}>
                                    <Text style={styles.menuItemTitle}>Session History</Text>
                                    <Text style={styles.menuItemDesc}>View past 2 days of records</Text>
                                </View>
                                <Text style={styles.menuItemArrow}>›</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem} onPress={openSettings}>
                                <Text style={styles.menuItemIcon}>⚙️</Text>
                                <View style={styles.menuItemContent}>
                                    <Text style={styles.menuItemTitle}>Settings</Text>
                                    <Text style={styles.menuItemDesc}>Profile, Server, Password</Text>
                                </View>
                                <Text style={styles.menuItemArrow}>›</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem} onPress={() => { closeDrawer(); setTimeout(() => navigation.navigate('RoleSelection'), 300); }}>
                                <Text style={styles.menuItemIcon}>🔄</Text>
                                <View style={styles.menuItemContent}>
                                    <Text style={styles.menuItemTitle}>Switch to Student</Text>
                                    <Text style={styles.menuItemDesc}>Scan QR as a student</Text>
                                </View>
                                <Text style={styles.menuItemArrow}>›</Text>
                            </TouchableOpacity>

                            <View style={styles.divider} />

                            {/* Logout */}
                            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                                <Text style={styles.logoutText}>🚪  Logout</Text>
                            </TouchableOpacity>

                            <Text style={styles.versionText}>Attendance System v2.1</Text>
                        </ScrollView>
                    </Animated.View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    scrollContent: { padding: 20, paddingTop: 60, paddingBottom: 40 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 28, gap: 12 },
    menuBtn: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: '#334155',
    },
    menuIcon: { fontSize: 22, color: '#f1f5f9' },
    greeting: { fontSize: 22, fontWeight: '700', color: '#f1f5f9' },
    subGreeting: { fontSize: 13, color: '#64748b', marginTop: 2 },
    card: { backgroundColor: '#1e293b', borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
    cardIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#312e81', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    cardIconText: { fontSize: 28 },
    cardTitle: { fontSize: 22, fontWeight: '700', color: '#f1f5f9', marginBottom: 8 },
    cardDesc: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    inputGroup: { width: '100%', marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#cbd5e1', marginBottom: 8 },
    input: { width: '100%', backgroundColor: '#0f172a', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14, fontSize: 16, color: '#f1f5f9', borderWidth: 1.5, borderColor: '#334155' },
    startBtn: { width: '100%', backgroundColor: '#6366f1', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
    startBtnDisabled: { backgroundColor: '#3730a3', opacity: 0.5 },
    startBtnText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
    loadingRow: { flexDirection: 'row', alignItems: 'center' },
    infoRow: { flexDirection: 'row', gap: 12 },
    infoCard: { flex: 1, backgroundColor: '#1e293b', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    infoIcon: { fontSize: 28, marginBottom: 8 },
    infoTitle: { fontSize: 14, fontWeight: '700', color: '#e2e8f0', marginBottom: 4 },
    infoDesc: { fontSize: 11, color: '#64748b', textAlign: 'center' },

    // Drawer
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
    drawer: {
        position: 'absolute', top: 0, bottom: 0, left: 0,
        width: DRAWER_WIDTH, backgroundColor: '#1e293b',
        borderRightWidth: 1, borderRightColor: '#334155',
        elevation: 20, shadowColor: '#000', shadowOffset: { width: 8, height: 0 },
        shadowOpacity: 0.5, shadowRadius: 24,
    },
    drawerContent: { paddingTop: 56, paddingBottom: 40, paddingHorizontal: 24 },

    // Profile card
    profileCard: {
        alignItems: 'center', paddingBottom: 20,
        backgroundColor: '#0f172a', borderRadius: 20, padding: 24,
        borderWidth: 1, borderColor: '#334155',
    },
    avatar: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center',
        marginBottom: 14, borderWidth: 3, borderColor: '#818cf8',
    },
    avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
    profileName: { fontSize: 20, fontWeight: '700', color: '#f1f5f9' },
    profileEmail: { fontSize: 13, color: '#64748b', marginTop: 4 },
    profileMeta: { marginTop: 14, gap: 8 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    metaIcon: { fontSize: 16 },
    metaText: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },

    divider: { height: 1, backgroundColor: '#334155', marginVertical: 16 },

    // Menu items
    menuItem: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingVertical: 14, paddingHorizontal: 4,
    },
    menuItemIcon: { fontSize: 24 },
    menuItemContent: { flex: 1 },
    menuItemTitle: { fontSize: 16, fontWeight: '600', color: '#f1f5f9' },
    menuItemDesc: { fontSize: 12, color: '#64748b', marginTop: 2 },
    menuItemArrow: { fontSize: 24, color: '#475569', fontWeight: '300' },

    // Server settings
    drawerSectionTitle: { fontSize: 14, fontWeight: '700', color: '#e2e8f0', marginBottom: 12 },
    drawerFieldGroup: { marginBottom: 8 },
    drawerLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' },
    drawerInput: {
        backgroundColor: '#0f172a', borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 12,
        fontSize: 14, color: '#f1f5f9',
        borderWidth: 1, borderColor: '#334155',
    },
    saveServerBtn: {
        marginTop: 10, backgroundColor: '#6366f1',
        paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    },
    saveServerBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

    logoutBtn: {
        backgroundColor: '#450a0a', paddingVertical: 14,
        borderRadius: 12, alignItems: 'center',
        borderWidth: 1, borderColor: '#dc2626',
    },
    logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '700' },
    versionText: { textAlign: 'center', color: '#334155', fontSize: 12, marginTop: 20 },
});

```

### `src/screens/LoginScreen.tsx`

```tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { login, saveUser } from '../api';

interface LoginScreenProps {
    navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!email.trim() || !password) {
            Alert.alert('Required', 'Please enter your email and password.');
            return;
        }

        setLoading(true);
        try {
            const result = await login(email.trim(), password);
            if (result.success) {
                await saveUser(result.user);
                navigation.replace('Home', {
                    userName: result.user.name,
                    userEmail: result.user.email,
                    userCollege: result.user.college || '',
                    userDepartment: result.user.department || '',
                    userAllowedDomain: result.user.allowedDomain || '',
                });
            } else {
                Alert.alert('Login Failed', result.error || 'Invalid credentials');
            }
        } catch (err: any) {
            Alert.alert('Connection Error', 'Cannot reach the server. Please check your internet connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.inner}>
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <View style={styles.logoCircle}>
                        <Text style={styles.logoText}>📋</Text>
                    </View>
                    <Text style={styles.title}>Attendance</Text>
                    <Text style={styles.subtitle}>Teacher Login</Text>
                </View>

                {/* Email */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="you@college.edu"
                        placeholderTextColor="#475569"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        editable={!loading}
                    />
                </View>

                {/* Password with eye toggle */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.passwordRow}>
                        <TextInput
                            style={styles.passwordInput}
                            placeholder="Enter password"
                            placeholderTextColor="#475569"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            editable={!loading}
                        />
                        <TouchableOpacity
                            onPress={() => setShowPassword(!showPassword)}
                            style={styles.eyeBtn}
                        >
                            <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Forgot Password */}
                <TouchableOpacity
                    onPress={() => navigation.navigate('ForgotPassword')}
                    style={styles.forgotBtn}
                >
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>

                {/* Login Button */}
                <TouchableOpacity
                    style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <View style={styles.row}>
                            <ActivityIndicator color="#fff" size="small" />
                            <Text style={styles.loginBtnText}>  Signing in...</Text>
                        </View>
                    ) : (
                        <Text style={styles.loginBtnText}>Login →</Text>
                    )}
                </TouchableOpacity>

                {/* Register Link */}
                <TouchableOpacity
                    onPress={() => navigation.navigate('Register')}
                    style={styles.registerLink}
                >
                    <Text style={styles.registerText}>
                        Don't have an account? <Text style={styles.registerHighlight}>Create one</Text>
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => navigation.navigate('RoleSelection')}
                    style={{ marginTop: 20, paddingVertical: 12 }}
                >
                    <Text style={{ color: '#64748b', textAlign: 'center', fontWeight: '600', fontSize: 14 }}>← Back to Role Selection</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    inner: { flex: 1, justifyContent: 'center', padding: 28 },
    logoContainer: { alignItems: 'center', marginBottom: 40 },
    logoCircle: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: '#312e81',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
    },
    logoText: { fontSize: 36 },
    title: { fontSize: 28, fontWeight: '800', color: '#f1f5f9' },
    subtitle: { fontSize: 15, color: '#64748b', marginTop: 4 },
    fieldGroup: { marginBottom: 18 },
    label: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: {
        width: '100%', backgroundColor: '#1e293b', borderRadius: 14,
        paddingHorizontal: 18, paddingVertical: 15,
        fontSize: 16, color: '#f1f5f9',
        borderWidth: 1.5, borderColor: '#334155',
    },
    passwordRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#1e293b', borderRadius: 14,
        borderWidth: 1.5, borderColor: '#334155',
    },
    passwordInput: {
        flex: 1, paddingHorizontal: 18, paddingVertical: 15,
        fontSize: 16, color: '#f1f5f9',
    },
    eyeBtn: { paddingHorizontal: 14, paddingVertical: 12 },
    eyeIcon: { fontSize: 20 },
    forgotBtn: { alignSelf: 'flex-end', marginBottom: 20 },
    forgotText: { color: '#818cf8', fontSize: 14, fontWeight: '600' },
    loginBtn: {
        backgroundColor: '#6366f1', paddingVertical: 17,
        borderRadius: 14, alignItems: 'center',
        shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
    },
    loginBtnDisabled: { opacity: 0.6 },
    loginBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
    row: { flexDirection: 'row', alignItems: 'center' },
    registerLink: { alignItems: 'center', marginTop: 24 },
    registerText: { color: '#64748b', fontSize: 15 },
    registerHighlight: { color: '#818cf8', fontWeight: '700' },
});

```

### `src/screens/RegisterScreen.tsx`

```tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { register } from '../api';

interface RegisterScreenProps {
    navigation: any;
}

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [college, setCollege] = useState('NIT Jamshedpur');
    const [department, setDepartment] = useState('');
    const [allowedDomain, setAllowedDomain] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleRegister = async () => {
        if (!name.trim() || !email.trim() || !password || !confirmPassword) {
            Alert.alert('Required', 'Please fill in all required fields.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Mismatch', 'Passwords do not match.');
            return;
        }
        if (password.length < 4) {
            Alert.alert('Too Short', 'Password must be at least 4 characters.');
            return;
        }

        setLoading(true);
        try {
            const result = await register(
                name.trim(),
                email.trim(),
                password,
                college.trim(),
                department.trim(),
                allowedDomain.trim()
            );
            if (result.success) {
                Alert.alert('Account Created! ✅', 'You can now login with your credentials.', [
                    { text: 'Go to Login', onPress: () => navigation.goBack() },
                ]);
            } else {
                Alert.alert('Error', result.error || 'Registration failed');
            }
        } catch (err: any) {
            Alert.alert('Connection Error', 'Cannot reach the server. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back to Login</Text>
                </TouchableOpacity>

                <View style={styles.logoContainer}>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Sign up to get started</Text>
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Full Name *</Text>
                    <TextInput style={styles.input} placeholder="Dr. Sharma" placeholderTextColor="#475569"
                        value={name} onChangeText={setName} editable={!loading} />
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Email *</Text>
                    <TextInput style={styles.input} placeholder="you@college.edu" placeholderTextColor="#475569"
                        value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" editable={!loading} />
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>College</Text>
                    <TextInput style={styles.input} placeholder="NIT Jamshedpur" placeholderTextColor="#475569"
                        value={college} onChangeText={setCollege} editable={!loading} />
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Department</Text>
                    <TextInput style={styles.input} placeholder="e.g. Computer Science" placeholderTextColor="#475569"
                        value={department} onChangeText={setDepartment} editable={!loading} />
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Institutional Domain</Text>
                    <TextInput style={styles.input} placeholder="e.g. nitjsr.ac.in" placeholderTextColor="#475569"
                        value={allowedDomain} onChangeText={setAllowedDomain} autoCapitalize="none" editable={!loading} />
                    <Text style={styles.fieldHint}>Restricts attendance to students with this email domain.</Text>
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Password *</Text>
                    <View style={styles.passwordRow}>
                        <TextInput style={styles.passwordInput} placeholder="Min 4 characters" placeholderTextColor="#475569"
                            value={password} onChangeText={setPassword} secureTextEntry={!showPassword} editable={!loading} />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                            <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Confirm Password *</Text>
                    <View style={styles.passwordRow}>
                        <TextInput style={styles.passwordInput} placeholder="Re-enter password" placeholderTextColor="#475569"
                            value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirm} editable={!loading} />
                        <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                            <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁️'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.registerBtn, loading && styles.registerBtnDisabled]}
                    onPress={handleRegister} disabled={loading} activeOpacity={0.8}
                >
                    {loading ? (
                        <View style={styles.row}>
                            <ActivityIndicator color="#fff" size="small" />
                            <Text style={styles.registerBtnText}>  Creating...</Text>
                        </View>
                    ) : (
                        <Text style={styles.registerBtnText}>Create Account</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    inner: { padding: 28, paddingTop: 56, paddingBottom: 40 },
    backBtn: { marginBottom: 20 },
    backText: { color: '#94a3b8', fontSize: 16, fontWeight: '600' },
    logoContainer: { alignItems: 'center', marginBottom: 28 },
    title: { fontSize: 26, fontWeight: '800', color: '#f1f5f9' },
    subtitle: { fontSize: 15, color: '#64748b', marginTop: 4 },
    fieldGroup: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: {
        width: '100%', backgroundColor: '#1e293b', borderRadius: 14,
        paddingHorizontal: 18, paddingVertical: 14,
        fontSize: 16, color: '#f1f5f9',
        borderWidth: 1.5, borderColor: '#334155',
    },
    passwordRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#1e293b', borderRadius: 14,
        borderWidth: 1.5, borderColor: '#334155',
    },
    passwordInput: {
        flex: 1, paddingHorizontal: 18, paddingVertical: 14,
        fontSize: 16, color: '#f1f5f9',
    },
    eyeBtn: { paddingHorizontal: 14, paddingVertical: 12 },
    eyeIcon: { fontSize: 20 },
    registerBtn: {
        backgroundColor: '#6366f1', paddingVertical: 17,
        borderRadius: 14, alignItems: 'center', marginTop: 8,
        shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
    },
    registerBtnDisabled: { opacity: 0.6 },
    registerBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
    row: { flexDirection: 'row', alignItems: 'center' },
    fieldHint: { fontSize: 12, color: '#64748b', marginTop: 4, marginLeft: 2 },
});

```

### `src/screens/ResponsesScreen.tsx`

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getResponses, getServerUrl } from '../api';
import { REFRESH_INTERVAL_SEC, APP_SECRET_KEY } from '../config';

interface ResponsesScreenProps {
    navigation: any;
    route: any;
}

interface ResponseRow {
    [key: string]: any;
}

export default function ResponsesScreen({ navigation, route }: ResponsesScreenProps) {
    const { sessionId, sessionName } = route.params;

    const [responses, setResponses] = useState<ResponseRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchData = useCallback(async (showLoader = false) => {
        if (showLoader) setLoading(true);
        else setRefreshing(true);

        try {
            const result = await getResponses(sessionId);
            if (result.responses) setResponses(result.responses);
        } catch (err: any) {
            console.warn('Fetch error:', err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [sessionId]);

    useEffect(() => { fetchData(true); }, []);

    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => fetchData(false), REFRESH_INTERVAL_SEC * 1000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchData]);

    const handleExport = async (action: 'download' | 'export') => {
        if (responses.length === 0) {
            Alert.alert('No Data', 'There are no responses to export.');
            return;
        }

        setMenuVisible(false);
        setExporting(true);
        try {
            const timestamp = sessionId;
            const safeName = sessionName.replace(/[^a-zA-Z0-9]/g, '_');
            const d = new Date(timestamp);
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            let hh = d.getHours();
            const min = String(d.getMinutes()).padStart(2, '0');
            const ampm = hh >= 12 ? 'PM' : 'AM';
            hh = hh % 12 || 12;
            const hhStr = String(hh).padStart(2, '0');
            const fileName = `attendance_${safeName}_${dd}-${mm}-${yyyy}_${hhStr}-${min}${ampm}.xlsx`;
            const filePath = `${FileSystem.documentDirectory}${fileName}`;

            const serverUrl = getServerUrl();
            const downloadUrl = `${serverUrl}/api/export?sessionId=${encodeURIComponent(sessionId)}&key=${encodeURIComponent(APP_SECRET_KEY)}`;
            const downloadResult = await FileSystem.downloadAsync(downloadUrl, filePath);

            if (action === 'export') {
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(downloadResult.uri, {
                        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        dialogTitle: 'Export Attendance',
                    });
                } else {
                    Alert.alert('Unavailable', 'Sharing is not available on this device');
                }
            } else {
                if (Platform.OS === 'android') {
                    let directoryUri = await AsyncStorage.getItem('savedExportDirectory');
                    let useSaved = false;
                    const base64Data = await FileSystem.readAsStringAsync(downloadResult.uri, { encoding: FileSystem.EncodingType.Base64 });
                    
                    if (directoryUri) {
                        try {
                            const newUri = await FileSystem.StorageAccessFramework.createFileAsync(
                                directoryUri,
                                fileName,
                                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                            );
                            await FileSystem.writeAsStringAsync(newUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
                            Alert.alert('Success', `File saved to chosen folder!`);
                            useSaved = true;
                        } catch (e) {
                            useSaved = false; // Folder deleted or permission revoked
                        }
                    }
                    
                    if (!useSaved) {
                        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                        if (permissions.granted) {
                            await AsyncStorage.setItem('savedExportDirectory', permissions.directoryUri);
                            const newUri = await FileSystem.StorageAccessFramework.createFileAsync(
                                permissions.directoryUri,
                                fileName,
                                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                            );
                            await FileSystem.writeAsStringAsync(newUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
                            Alert.alert('Success', `File saved to chosen folder!`);
                        } else {
                            Alert.alert('Permission Denied', 'Storage permission must be granted to save the file directly.');
                        }
                    }
                } else {
                    if (await Sharing.isAvailableAsync()) {
                        await Sharing.shareAsync(downloadResult.uri, {
                            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                            dialogTitle: 'Download Attendance',
                        });
                    } else {
                        Alert.alert('Saved', `File saved to:\n${filePath}`);
                    }
                }
            }
        } catch (err: any) {
            Alert.alert('Download Error', err.message || 'Failed to download');
        } finally {
            setExporting(false);
        }
    };

    const renderItem = ({ item, index }: { item: ResponseRow; index: number }) => (
        <View style={styles.row}>
            <View style={styles.rowHeader}>
                <Text style={styles.rowNumber}>#{index + 1}</Text>
                <Text style={styles.rowEmail} numberOfLines={1}>
                    {item['Email'] || item['email'] || 'N/A'}
                </Text>
            </View>
            <View style={styles.rowDetails}>
                <View style={styles.detailChip}>
                    <Text style={styles.detailLabel}>Reg No</Text>
                    <Text style={styles.detailValue}>{item['Reg No'] || item['Roll Number'] || '—'}</Text>
                </View>
                <View style={styles.detailChip}>
                    <Text style={styles.detailLabel}>Name</Text>
                    <Text style={styles.detailValue}>{item['Name'] || '—'}</Text>
                </View>
            </View>
            <View style={styles.rowDetails}>
                <View style={[styles.detailChip, { backgroundColor: '#0c4a6e' }]}>
                    <Text style={[styles.detailLabel, { color: '#7dd3fc' }]}>📅 Date</Text>
                    <Text style={[styles.detailValue, { color: '#bae6fd' }]}>{item['Date'] || '—'}</Text>
                </View>
                <View style={[styles.detailChip, { backgroundColor: '#0c4a6e' }]}>
                    <Text style={[styles.detailLabel, { color: '#7dd3fc' }]}>🕐 Time</Text>
                    <Text style={[styles.detailValue, { color: '#bae6fd' }]}>{item['Time'] || '—'}</Text>
                </View>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.loadingText}>Loading responses...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Responses</Text>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{responses.length}</Text>
                </View>
            </View>

            <Text style={styles.session} numberOfLines={1}>{sessionName}</Text>

            <View style={styles.controls}>
                <TouchableOpacity
                    style={[styles.controlBtn, autoRefresh && styles.controlBtnActive]}
                    onPress={() => setAutoRefresh(!autoRefresh)}
                >
                    <Text style={styles.controlBtnText}>{autoRefresh ? '🔄 Auto ON' : '⏸ Auto OFF'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlBtn} onPress={() => fetchData(false)}>
                    <Text style={styles.controlBtnText}>{refreshing ? '⏳' : '🔄'} Refresh</Text>
                </TouchableOpacity>
            </View>

            {responses.length === 0 ? (
                <View style={styles.emptyBox}>
                    <Text style={styles.emptyIcon}>📭</Text>
                    <Text style={styles.emptyTitle}>No responses yet</Text>
                    <Text style={styles.emptyDesc}>Waiting for students to submit...</Text>
                </View>
            ) : (
                <FlatList
                    data={responses}
                    renderItem={renderItem}
                    keyExtractor={(_, index) => index.toString()}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}

            <View style={styles.bottomActions}>
                {menuVisible && (
                    <View style={styles.menuContainer}>
                        <TouchableOpacity style={styles.menuItem} onPress={() => handleExport('download')}>
                            <Text style={styles.menuItemText}>📥  Download</Text>
                        </TouchableOpacity>
                        <View style={styles.menuDivider} />
                        <TouchableOpacity style={styles.menuItem} onPress={() => handleExport('export')}>
                            <Text style={styles.menuItemText}>📤  Export</Text>
                        </TouchableOpacity>
                    </View>
                )}
                <TouchableOpacity style={styles.exportBtn} onPress={() => setMenuVisible(!menuVisible)} disabled={exporting} activeOpacity={0.8}>
                    <Text style={styles.exportBtnText}>{exporting ? '⏳ Processing...' : '📥  Download  ▲'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a', paddingTop: 56 },
    centered: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#94a3b8', marginTop: 12, fontSize: 15 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 4 },
    backBtn: { padding: 8, marginRight: 8 },
    backText: { color: '#94a3b8', fontSize: 16, fontWeight: '600' },
    title: { flex: 1, fontSize: 22, fontWeight: '700', color: '#f1f5f9' },
    countBadge: { backgroundColor: '#6366f1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, minWidth: 36, alignItems: 'center' },
    countText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
    session: { fontSize: 13, color: '#64748b', paddingHorizontal: 28, marginBottom: 12 },
    controls: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 12 },
    controlBtn: { backgroundColor: '#1e293b', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#334155' },
    controlBtnActive: { borderColor: '#22c55e', backgroundColor: '#052e16' },
    controlBtnText: { color: '#e2e8f0', fontSize: 13, fontWeight: '600' },
    listContent: { paddingHorizontal: 20, paddingBottom: 12 },
    row: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
    rowHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    rowNumber: { fontSize: 14, fontWeight: '700', color: '#6366f1', marginRight: 10, minWidth: 28 },
    rowEmail: { flex: 1, fontSize: 14, color: '#e2e8f0' },
    rowDetails: { flexDirection: 'row', gap: 10 },
    detailChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 6 },
    detailLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
    detailValue: { fontSize: 13, color: '#cbd5e1', fontWeight: '600' },
    emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#e2e8f0', marginBottom: 4 },
    emptyDesc: { fontSize: 14, color: '#64748b', textAlign: 'center' },
    bottomActions: { paddingHorizontal: 20, paddingVertical: 16, gap: 10, borderTopWidth: 1, borderTopColor: '#1e293b' },
    menuContainer: { backgroundColor: '#1e293b', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: '#334155' },
    menuItem: { paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' },
    menuDivider: { height: 1, backgroundColor: '#334155', marginHorizontal: 8 },
    menuItemText: { color: '#f1f5f9', fontSize: 16, fontWeight: '600' },
    exportBtn: { backgroundColor: '#059669', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
    exportBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});

```

### `src/screens/RoleScreen.tsx`

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getUser } from '../api';

const { width } = Dimensions.get('window');

export default function RoleScreen({ navigation }: any) {
    const handleTeacher = async () => {
        const user = await getUser();
        if (user) {
            navigation.navigate('Home', {
                userName: user.name,
                userEmail: user.email,
                userCollege: user.college,
                userDepartment: user.department,
                userAllowedDomain: user.allowedDomain || '',
            });
        } else {
            navigation.navigate('Login');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Welcome to Attendance</Text>
                    <Text style={styles.subtitle}>Please select your role to continue</Text>
                </View>

                <View style={styles.roleContainer}>
                    <TouchableOpacity
                        style={styles.roleCard}
                        onPress={handleTeacher}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.icon}>👨‍🏫</Text>
                        <Text style={styles.roleTitle}>I am a Teacher</Text>
                        <Text style={styles.roleDesc}>Create and manage attendance sessions</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.roleCard, styles.studentCard]}
                        onPress={() => navigation.navigate('StudentLogin')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.icon}>👨‍🎓</Text>
                        <Text style={styles.roleTitle}>I am a Student</Text>
                        <Text style={styles.roleDesc}>Scan QR codes and submit attendance</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 60,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#94a3b8',
        textAlign: 'center',
    },
    roleContainer: {
        gap: 24,
    },
    roleCard: {
        backgroundColor: '#1e293b',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    studentCard: {
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.05)',
    },
    icon: {
        fontSize: 48,
        marginBottom: 16,
    },
    roleTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 8,
    },
    roleDesc: {
        fontSize: 14,
        color: '#94a3b8',
        textAlign: 'center',
    },
});

```

### `src/screens/SessionScreen.tsx`

```tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Dimensions,
    ScrollView,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { stopSession } from '../api';
import { SESSION_DURATION_MS } from '../config';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const QR_SIZE = Math.min(SCREEN_WIDTH - 64, 320);

interface SessionScreenProps {
    navigation: any;
    route: any;
}

export default function SessionScreen({ navigation, route }: SessionScreenProps) {
    const { sessionName, formUrl } = route.params;

    const [timeLeft, setTimeLeft] = useState(SESSION_DURATION_MS);
    const [isActive, setIsActive] = useState(true);
    const [closing, setClosing] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const viewShotRef = useRef<any>(null);

    // Keep screen awake
    useEffect(() => {
        activateKeepAwakeAsync('session');
        return () => { deactivateKeepAwake('session'); };
    }, []);

    // Countdown timer (Absolute Time)
    useEffect(() => {
        if (!isActive) return;

        const startTime = route.params.sessionId || Date.now();
        const endTime = startTime + SESSION_DURATION_MS;

        const tick = () => {
            const now = Date.now();
            const remaining = endTime - now;

            if (remaining <= 0) {
                setTimeLeft(0);
                handleTerminate(true);
                return;
            }
            setTimeLeft(remaining);
        };

        // Initial tick
        tick();

        intervalRef.current = setInterval(tick, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isActive]);

    const handleTerminate = useCallback(async (auto = false) => {
        if (!isActive && !auto) return;

        setClosing(true);
        setIsActive(false);
        if (intervalRef.current) clearInterval(intervalRef.current);

        try {
            await stopSession(route.params.sessionId);
            Alert.alert(
                auto ? 'Time Up!' : 'Session Terminated',
                auto
                    ? 'The 10-minute session has ended. Form is now closed.'
                    : 'Attendance session has been closed.',
                [{ text: 'OK' }]
            );
        } catch (err: any) {
            Alert.alert('Warning', 'Session may not have closed properly: ' + err.message);
        } finally {
            setClosing(false);
        }
    }, [isActive]);

    const formatTime = (ms: number) => {
        const totalSec = Math.max(0, Math.floor(ms / 1000));
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    const getTimerColor = () => {
        if (timeLeft <= 60000) return '#ef4444';
        if (timeLeft <= 180000) return '#f59e0b';
        return '#22c55e';
    };

    const viewResponses = () => {
        navigation.navigate('Responses', { 
            sessionId: route.params.sessionId, 
            sessionName 
        });
    };

    const goBack = () => {
        if (isActive) {
            Alert.alert(
                'Leave Running or Terminate?',
                'You can leave this session running in the background and start another one.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Leave Running', style: 'default', onPress: () => {
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            } else {
                                navigation.navigate('Home');
                            }
                        }
                    },
                    {
                        text: 'Terminate', style: 'destructive', onPress: async () => {
                            await handleTerminate();
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            } else {
                                navigation.navigate('Home');
                            }
                        }
                    },
                ]
            );
        } else {
            if (navigation.canGoBack()) {
                navigation.goBack();
            } else {
                navigation.navigate('Home');
            }
        }
    };

    const handleShareQR = async () => {
        try {
            if (!viewShotRef.current) return;
            // Delay slightly to ensure render
            const uri = await viewShotRef.current.capture();
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    dialogTitle: 'Share Session QR Code',
                });
            } else {
                Alert.alert('Sharing Unavailable', 'Your device does not support sharing right now.');
            }
        } catch (error: any) {
            Alert.alert('Error sharing', error.message);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <View style={[styles.statusBadge, isActive ? styles.badgeActive : styles.badgeClosed]}>
                    <Text style={[styles.statusText, !isActive && { color: '#ef4444' }]}>
                        {isActive ? '● LIVE' : '● CLOSED'}
                    </Text>
                </View>
            </View>

            {/* Session Info */}
            <Text style={styles.sessionLabel}>Session</Text>
            <Text style={styles.sessionName}>{sessionName}</Text>

            {/* Timer */}
            <View style={styles.timerContainer}>
                <Text style={[styles.timer, { color: getTimerColor() }]}>
                    {formatTime(timeLeft)}
                </Text>
                <Text style={styles.timerLabel}>
                    {isActive ? 'Time Remaining' : 'Session Ended'}
                </Text>
            </View>

            {/* QR Code */}
            <View style={styles.qrContainer}>
                {isActive ? (
                    <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }}>
                        <View style={styles.qrWrapper}>
                            <QRCode
                                value={formUrl}
                                size={QR_SIZE}
                                backgroundColor="#ffffff"
                                color="#0f172a"
                            />
                        </View>
                    </ViewShot>
                ) : (
                    <View style={styles.qrClosed}>
                        <Text style={styles.qrClosedIcon}>🚫</Text>
                        <Text style={styles.qrClosedText}>Session Closed</Text>
                    </View>
                )}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
                {isActive && (
                    <>
                        <TouchableOpacity
                            style={styles.shareBtn}
                            onPress={handleShareQR}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.shareBtnText}>🔗  Share QR Code</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.terminateBtn}
                            onPress={() => handleTerminate(false)}
                            disabled={closing}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.terminateBtnText}>
                                {closing ? '⏳ Closing...' : '⏹  Terminate Session'}
                            </Text>
                        </TouchableOpacity>
                    </>
                )}

                <TouchableOpacity style={styles.actionBtn} onPress={viewResponses} activeOpacity={0.8}>
                    <Text style={styles.actionBtnText}>📊  View Responses</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    scrollContent: { padding: 20, paddingTop: 56, paddingBottom: 40, alignItems: 'center' },
    header: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    backBtn: { padding: 8 },
    backText: { color: '#94a3b8', fontSize: 16, fontWeight: '600' },
    statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
    badgeActive: { backgroundColor: '#052e16' },
    badgeClosed: { backgroundColor: '#450a0a' },
    statusText: { color: '#22c55e', fontWeight: '700', fontSize: 13 },
    sessionLabel: { fontSize: 13, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    sessionName: { fontSize: 20, fontWeight: '700', color: '#f1f5f9', textAlign: 'center', marginBottom: 20 },
    timerContainer: { alignItems: 'center', marginBottom: 24 },
    timer: { fontSize: 56, fontWeight: '800', fontVariant: ['tabular-nums'] },
    timerLabel: { fontSize: 13, color: '#64748b', marginTop: 4 },
    qrContainer: { marginBottom: 28 },
    qrWrapper: { padding: 16, backgroundColor: '#ffffff', borderRadius: 20, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 },
    qrClosed: { width: QR_SIZE + 32, height: QR_SIZE + 32, backgroundColor: '#1e293b', borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#ef4444' },
    qrClosedIcon: { fontSize: 48, marginBottom: 12 },
    qrClosedText: { fontSize: 18, color: '#ef4444', fontWeight: '700' },
    actions: { width: '100%', gap: 12 },
    shareBtn: { width: '100%', backgroundColor: '#6366f1', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginBottom: 4 },
    shareBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
    terminateBtn: { width: '100%', backgroundColor: '#dc2626', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
    terminateBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
    actionBtn: { width: '100%', backgroundColor: '#1e293b', paddingVertical: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    actionBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
    actionBtnOutline: { width: '100%', backgroundColor: 'transparent', paddingVertical: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#334155' },
    actionBtnOutlineText: { color: '#94a3b8', fontSize: 16, fontWeight: '600' },
});

```

### `src/screens/SettingsScreen.tsx`

```tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { getServerUrl, setServerUrl, pingServer, saveUser, updateProfile } from '../api';
import { APP_SECRET_HEADER } from '../config';

interface SettingsScreenProps {
    navigation: any;
    route: any;
}

export default function SettingsScreen({ navigation, route }: SettingsScreenProps) {
    const { userName, userEmail, userCollege, userDepartment, userAllowedDomain } = route.params || {};
    const [name, setName] = useState(userName || '');
    const [college, setCollege] = useState(userCollege || '');
    const [department, setDepartment] = useState(userDepartment || '');
    const [allowedDomain, setAllowedDomain] = useState(userAllowedDomain || '');

    const [serverUrl, setServerUrlState] = useState(getServerUrl());
    const [testingServer, setTestingServer] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);

    const [saving, setSaving] = useState(false);

    // ---- Profile ----
    const handleSaveProfile = async () => {
        if (!name.trim()) {
            Alert.alert('Required', 'Name cannot be empty.');
            return;
        }
        setSaving(true);
        try {
            const cleanDomain = allowedDomain.replace(/@/g, '').trim().toLowerCase();
            const data = await updateProfile(userEmail, name.trim(), college.trim(), department.trim(), cleanDomain);
            
            if (data.success) {
                Alert.alert('✅ Saved', 'Profile updated successfully.');
                // Update storage so next launch has new data
                await saveUser(data.user);

                // Update route params so HomeScreen picks up the changes
                navigation.navigate('Home', {
                    userName: data.user.name,
                    userEmail: data.user.email,
                    userCollege: data.user.college,
                    userDepartment: data.user.department,
                    userAllowedDomain: data.user.allowedDomain || '',
                });
            } else {
                Alert.alert('Error', data.error || 'Failed to save profile.');
            }
        } catch {
            Alert.alert('Error', 'Could not reach server.');
        } finally {
            setSaving(false);
        }
    };

    // ---- Server ----
    const handleSaveServer = async () => {
        const url = serverUrl.trim();
        if (!url) {
            Alert.alert('Required', 'Server URL cannot be empty.');
            return;
        }
        setTestingServer(true);
        const reachable = await pingServer(url);
        setTestingServer(false);

        if (!reachable) {
            Alert.alert(
                'Unreachable',
                `Could not reach ${url}. Save anyway?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Save Anyway', onPress: () => { setServerUrl(url); Alert.alert('Saved ✅', 'Server URL updated.'); } },
                ]
            );
            return;
        }
        setServerUrl(url);
        Alert.alert('Saved ✅', 'Server URL updated and verified!');
    };

    // ---- Password ----
    const handleChangePassword = async () => {
        if (!currentPassword) {
            Alert.alert('Required', 'Enter your current password.');
            return;
        }
        if (!newPassword || newPassword.length < 4) {
            Alert.alert('Required', 'New password must be at least 4 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Mismatch', 'New password and confirmation do not match.');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`${getServerUrl()}/api/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...APP_SECRET_HEADER },
                body: JSON.stringify({
                    email: userEmail,
                    currentPassword,
                    newPassword,
                }),
            });
            const data = await res.json();
            if (data.success) {
                Alert.alert('✅ Done', 'Password changed successfully.');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                Alert.alert('Error', data.error || 'Failed to change password.');
            }
        } catch {
            Alert.alert('Error', 'Could not reach server.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Settings</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

                {/* ====== PROFILE SECTION ====== */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionIcon}>👤</Text>
                        <Text style={styles.sectionTitle}>Profile</Text>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Your name"
                            placeholderTextColor="#475569"
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Email</Text>
                        <View style={[styles.input, styles.inputReadonly]}>
                            <Text style={styles.readonlyText}>{userEmail || '—'}</Text>
                        </View>
                        <Text style={styles.hint}>Email cannot be changed</Text>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>College / Institution</Text>
                        <TextInput
                            style={styles.input}
                            value={college}
                            onChangeText={setCollege}
                            placeholder="e.g. NIT Jamshedpur"
                            placeholderTextColor="#475569"
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Department</Text>
                        <TextInput
                            style={styles.input}
                            value={department}
                            onChangeText={setDepartment}
                            placeholder="e.g. Computer Science"
                            placeholderTextColor="#475569"
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Allowed Student Domain</Text>
                        <TextInput
                            style={styles.input}
                            value={allowedDomain}
                            onChangeText={(text) => setAllowedDomain(text.replace(/@/g, ''))}
                            placeholder="e.g. nitjsr.ac.in"
                            placeholderTextColor="#475569"
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                        />
                        <Text style={styles.hint}>Only students with this email domain can mark attendance. Leave blank to allow all domains.</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                        onPress={handleSaveProfile}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.saveBtnText}>💾 Save Profile</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* ====== SERVER SECTION ====== */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionIcon}>🌐</Text>
                        <Text style={styles.sectionTitle}>Server</Text>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Server URL</Text>
                        <TextInput
                            style={styles.input}
                            value={serverUrl}
                            onChangeText={setServerUrlState}
                            placeholder="https://your-server.onrender.com"
                            placeholderTextColor="#475569"
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="url"
                        />
                        <Text style={styles.hint}>The backend server where attendance data is stored</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveBtn, styles.serverBtn, testingServer && styles.saveBtnDisabled]}
                        onPress={handleSaveServer}
                        disabled={testingServer}
                    >
                        {testingServer ? (
                            <View style={styles.row}>
                                <ActivityIndicator color="#fff" size="small" />
                                <Text style={styles.saveBtnText}>  Testing connection...</Text>
                            </View>
                        ) : (
                            <Text style={styles.saveBtnText}>🔗 Test & Save</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* ====== PASSWORD SECTION ====== */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionIcon}>🔒</Text>
                        <Text style={styles.sectionTitle}>Change Password</Text>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Current Password</Text>
                        <View style={styles.passwordRow}>
                            <TextInput
                                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                placeholder="Enter current password"
                                placeholderTextColor="#475569"
                                secureTextEntry={!showCurrentPw}
                            />
                            <TouchableOpacity
                                style={styles.eyeBtn}
                                onPress={() => setShowCurrentPw(!showCurrentPw)}
                            >
                                <Text style={styles.eyeText}>{showCurrentPw ? '🙈' : '👁️'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>New Password</Text>
                        <View style={styles.passwordRow}>
                            <TextInput
                                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                placeholder="At least 4 characters"
                                placeholderTextColor="#475569"
                                secureTextEntry={!showNewPw}
                            />
                            <TouchableOpacity
                                style={styles.eyeBtn}
                                onPress={() => setShowNewPw(!showNewPw)}
                            >
                                <Text style={styles.eyeText}>{showNewPw ? '🙈' : '👁️'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Confirm New Password</Text>
                        <TextInput
                            style={styles.input}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder="Re-enter new password"
                            placeholderTextColor="#475569"
                            secureTextEntry={!showNewPw}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.saveBtn, styles.passwordBtn, saving && styles.saveBtnDisabled]}
                        onPress={handleChangePassword}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.saveBtnText}>🔐 Change Password</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* ====== ABOUT SECTION ====== */}
                <View style={[styles.section, { borderColor: '#1e293b' }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionIcon}>ℹ️</Text>
                        <Text style={styles.sectionTitle}>About</Text>
                    </View>
                    <View style={styles.aboutRow}>
                        <Text style={styles.aboutLabel}>Version</Text>
                        <Text style={styles.aboutValue}>2.4.1</Text>
                    </View>
                    <View style={styles.aboutRow}>
                        <Text style={styles.aboutLabel}>Email Domain</Text>
                        <Text style={styles.aboutValue}>{userAllowedDomain ? `@${userAllowedDomain}` : 'All allowed'}</Text>
                    </View>
                    <View style={styles.aboutRow}>
                        <Text style={styles.aboutLabel}>App ID</Text>
                        <Text style={styles.aboutValue}>com.attendance.system</Text>
                    </View>
                    <View style={styles.aboutRow}>
                        <Text style={styles.aboutLabel}>Device Binding</Text>
                        <Text style={[styles.aboutValue, { color: '#22c55e' }]}>✅ Active</Text>
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
        paddingTop: 56, paddingBottom: 12,
    },
    backBtn: { padding: 8, marginRight: 8 },
    backText: { color: '#94a3b8', fontSize: 16, fontWeight: '600' },
    title: { flex: 1, fontSize: 22, fontWeight: '700', color: '#f1f5f9' },

    scrollContent: { padding: 20, paddingTop: 8, paddingBottom: 40 },

    section: {
        backgroundColor: '#1e293b', borderRadius: 20, padding: 24,
        marginBottom: 16, borderWidth: 1, borderColor: '#334155',
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    sectionIcon: { fontSize: 22 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#f1f5f9' },

    field: { marginBottom: 16 },
    label: {
        fontSize: 12, fontWeight: '600', color: '#94a3b8',
        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
    },
    input: {
        backgroundColor: '#0f172a', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 14,
        fontSize: 15, color: '#f1f5f9',
        borderWidth: 1.5, borderColor: '#334155',
    },
    inputReadonly: {
        backgroundColor: '#1e293b', borderColor: '#475569',
        justifyContent: 'center',
    },
    readonlyText: { fontSize: 15, color: '#64748b' },
    hint: { fontSize: 11, color: '#475569', marginTop: 6 },

    passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    eyeBtn: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155',
        justifyContent: 'center', alignItems: 'center',
    },
    eyeText: { fontSize: 18 },

    saveBtn: {
        backgroundColor: '#6366f1', paddingVertical: 14,
        borderRadius: 12, alignItems: 'center', marginTop: 8,
    },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    serverBtn: { backgroundColor: '#059669' },
    passwordBtn: { backgroundColor: '#dc2626' },
    row: { flexDirection: 'row', alignItems: 'center' },

    aboutRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#0f172a',
    },
    aboutLabel: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },
    aboutValue: { fontSize: 14, color: '#e2e8f0', fontWeight: '600' },
});

```

### `src/screens/StudentDashboardScreen.tsx`

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated, Dimensions, TouchableWithoutFeedback } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.78;

export default function StudentDashboardScreen({ navigation }: any) {
    const [student, setStudent] = useState<{ name: string; email: string; deviceId: string } | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const overlayAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadStudent();
    }, []);

    const loadStudent = async () => {
        try {
            const saved = await AsyncStorage.getItem('student_user');
            if (saved) {
                const parsed = JSON.parse(saved);
                setStudent(parsed);
            } else {
                navigation.replace('StudentLogin');
            }
        } catch (e) {
            navigation.replace('StudentLogin');
        }
    };

    const openDrawer = () => {
        setDrawerOpen(true);
        Animated.parallel([
            Animated.spring(drawerAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
            Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();
    };

    const closeDrawer = () => {
        Animated.parallel([
            Animated.spring(drawerAnim, { toValue: -DRAWER_WIDTH, useNativeDriver: true, tension: 65, friction: 11 }),
            Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => setDrawerOpen(false));
    };

    const handleLogout = () => {
        closeDrawer();
        setTimeout(() => {
            Alert.alert(
                'Sign Out',
                'This will remove your device binding. You will need to sign in again.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Sign Out',
                        style: 'destructive',
                        onPress: async () => {
                            await AsyncStorage.removeItem('student_user');
                            navigation.replace('RoleSelection');
                        }
                    }
                ]
            );
        }, 300);
    };

    // Parse email: 2022UGCM030@nitjsr.ac.in
    // Format: {4-digit year}{UG|PG}{branch letters}{reg digits}@domain
    const getStudentInfo = () => {
        if (!student) return { regNo: '', year: '', program: '', branch: '' };
        const prefix = student.email.split('@')[0].toUpperCase();

        // Extract year (first 4 digits)
        const yearMatch = prefix.match(/^(\d{4})/);
        const year = yearMatch ? yearMatch[1] : '';
        const afterYear = prefix.slice(year.length);

        // Extract program (UG or PG)
        let program = '';
        let afterProgram = afterYear;
        if (afterYear.startsWith('UG')) {
            program = 'Undergraduate (UG)';
            afterProgram = afterYear.slice(2);
        } else if (afterYear.startsWith('PG')) {
            program = 'Postgraduate (PG)';
            afterProgram = afterYear.slice(2);
        }

        // Extract branch (letters) and reg number (trailing digits)
        const branchRegMatch = afterProgram.match(/^([A-Z]+)(\d+)$/);
        let branchCode = '';
        let regNo = '';
        if (branchRegMatch) {
            branchCode = branchRegMatch[1];
            regNo = branchRegMatch[2];
        } else {
            branchCode = afterProgram.replace(/\d+/g, '');
            regNo = afterProgram.replace(/[A-Z]+/gi, '');
        }

        return {
            regNo: prefix,
            year,
            program,
            branchCode,
            regNumber: regNo
        };
    };

    if (!student) return <View style={styles.container} />;

    const info = getStudentInfo();

    return (
        <View style={styles.container}>
            {/* ===== MAIN CONTENT ===== */}
            <View style={styles.mainContent}>
                {/* Top Bar */}
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={openDrawer} style={styles.hamburgerBtn} activeOpacity={0.7}>
                        <Text style={styles.hamburgerIcon}>☰</Text>
                    </TouchableOpacity>
                    <Text style={styles.topBarTitle}>Student Dashboard</Text>
                    <View style={{ width: 44 }} />
                </View>

                {/* Welcome */}
                <View style={styles.welcomeSection}>
                    <Text style={styles.welcomeText}>Welcome back,</Text>
                    <Text style={styles.welcomeName}>{info.regNo} 👋</Text>
                </View>

                {/* Scan QR Button */}
                <TouchableOpacity
                    style={styles.scanBtn}
                    onPress={() => navigation.navigate('StudentScanner')}
                    activeOpacity={0.8}
                >
                    <View style={styles.scanIconCircle}>
                        <Text style={styles.scanIcon}>📷</Text>
                    </View>
                    <Text style={styles.scanTitle}>Scan Attendance QR</Text>
                    <Text style={styles.scanDesc}>Tap to open your camera and scan the teacher's QR code displayed in class</Text>
                </TouchableOpacity>

                {/* Gallery Upload */}
                <TouchableOpacity
                    style={styles.galleryBtn}
                    onPress={() => navigation.navigate('StudentScanner')}
                    activeOpacity={0.8}
                >
                    <Text style={styles.galleryBtnText}>🖼️  Or upload QR from Gallery</Text>
                </TouchableOpacity>
            </View>

            {/* ===== DRAWER OVERLAY ===== */}
            {drawerOpen && (
                <TouchableWithoutFeedback onPress={closeDrawer}>
                    <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} />
                </TouchableWithoutFeedback>
            )}

            {/* ===== DRAWER ===== */}
            <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
                {/* Profile Header */}
                <View style={styles.drawerProfile}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{info.regNo ? info.regNo.charAt(0).toUpperCase() : 'S'}</Text>
                    </View>
                    <Text style={styles.drawerName}>{info.regNo}</Text>
                    <Text style={styles.drawerEmail}>{student.email}</Text>
                </View>

                {/* Info Items */}
                <View style={styles.drawerBody}>
                    <View style={styles.drawerInfoItem}>
                        <Text style={styles.drawerInfoLabel}>Registration No.</Text>
                        <Text style={styles.drawerInfoValue}>{info.regNo}</Text>
                    </View>
                    <View style={styles.drawerInfoItem}>
                        <Text style={styles.drawerInfoLabel}>Batch Year</Text>
                        <Text style={styles.drawerInfoValue}>{info.year || 'N/A'}</Text>
                    </View>
                    <View style={styles.drawerInfoItem}>
                        <Text style={styles.drawerInfoLabel}>Program</Text>
                        <Text style={styles.drawerInfoValue}>{info.program || 'N/A'}</Text>
                    </View>
                    <View style={styles.drawerInfoItem}>
                        <Text style={styles.drawerInfoLabel}>Branch Code</Text>
                        <Text style={styles.drawerInfoValue}>{info.branchCode || 'N/A'}</Text>
                    </View>
                    <View style={styles.drawerInfoItem}>
                        <Text style={styles.drawerInfoLabel}>Roll / Reg #</Text>
                        <Text style={styles.drawerInfoValue}>{info.regNumber || 'N/A'}</Text>
                    </View>
                </View>

                {/* Drawer Actions */}
                <View style={styles.drawerActions}>
                    <TouchableOpacity style={styles.drawerActionBtn} onPress={() => { closeDrawer(); navigation.navigate('RoleSelection'); }} activeOpacity={0.8}>
                        <Text style={styles.drawerActionText}>🔄  Switch to Teacher</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.drawerLogoutBtn} onPress={handleLogout} activeOpacity={0.8}>
                        <Text style={styles.drawerLogoutText}>🚪  Sign Out</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },

    // Main Content
    mainContent: { flex: 1, paddingTop: 60 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 40 },
    hamburgerBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    hamburgerIcon: { fontSize: 22, color: '#f1f5f9' },
    topBarTitle: { fontSize: 18, fontWeight: '700', color: '#f8fafc' },

    welcomeSection: { paddingHorizontal: 24, marginBottom: 40 },
    welcomeText: { fontSize: 16, color: '#94a3b8', marginBottom: 4 },
    welcomeName: { fontSize: 28, fontWeight: '800', color: '#f8fafc' },

    // Scan Button
    scanBtn: { marginHorizontal: 24, backgroundColor: '#1e293b', padding: 32, borderRadius: 28, borderWidth: 2, borderColor: '#22c55e', alignItems: 'center', shadowColor: '#22c55e', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8, marginBottom: 16 },
    scanIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(34, 197, 94, 0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    scanIcon: { fontSize: 36 },
    scanTitle: { fontSize: 22, fontWeight: '800', color: '#22c55e', marginBottom: 8 },
    scanDesc: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 22, paddingHorizontal: 8 },

    galleryBtn: { marginHorizontal: 24, backgroundColor: '#1e293b', paddingVertical: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    galleryBtnText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },

    // Overlay
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 10 },

    // Drawer
    drawer: { position: 'absolute', top: 0, left: 0, bottom: 0, width: DRAWER_WIDTH, backgroundColor: '#1e293b', zIndex: 20, borderRightWidth: 1, borderRightColor: '#334155', shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 20 },

    drawerProfile: { paddingTop: 70, paddingBottom: 24, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#334155', alignItems: 'center' },
    avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', marginBottom: 14, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
    avatarText: { color: '#ffffff', fontSize: 32, fontWeight: '800' },
    drawerName: { fontSize: 20, fontWeight: '800', color: '#f8fafc', marginBottom: 4 },
    drawerEmail: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },

    drawerBody: { padding: 24, gap: 4 },
    drawerInfoItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(51, 65, 85, 0.5)' },
    drawerInfoLabel: { color: '#64748b', fontSize: 13, fontWeight: '600' },
    drawerInfoValue: { color: '#f1f5f9', fontSize: 14, fontWeight: '700' },

    drawerActions: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, gap: 12, borderTopWidth: 1, borderTopColor: '#334155' },
    drawerActionBtn: { backgroundColor: '#0f172a', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    drawerActionText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
    drawerLogoutBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    drawerLogoutText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
});

```

### `src/screens/StudentLoginScreen.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { DEFAULT_SERVER_URL, APP_SECRET_HEADER } from '../config';

export default function StudentLoginScreen({ navigation }: any) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        checkExistingStudent();
    }, []);

    const checkExistingStudent = async () => {
        try {
            const savedStudent = await AsyncStorage.getItem('student_user');
            if (savedStudent) {
                navigation.replace('StudentDashboard');
            }
        } catch (e) { }
        finally { setChecking(false); }
    };

    const handleLogin = async () => {

        if (!Device.isDevice) {
            Alert.alert('Security Violation', 'This application can only be used on physical mobile devices.');
            return;
        }

        if (!email.trim() || !email.includes('@')) {
            Alert.alert('Invalid Email', 'Please enter your college email address.');
            return;
        }

        setLoading(true);
        try {
            let hardwareId = 'unknown-device';
            if (Platform.OS === 'android') {
                hardwareId = Application.getAndroidId() || 'android-fallback';
            } else if (Platform.OS === 'ios') {
                const iosId = await Application.getIosIdForVendorAsync();
                hardwareId = iosId || 'ios-fallback';
            } else {
                hardwareId = Platform.OS;
            }

            const deviceId = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                hardwareId
            );

            const response = await fetch(`${DEFAULT_SERVER_URL}/api/student/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...APP_SECRET_HEADER },
                body: JSON.stringify({ email: email.toLowerCase().trim(), deviceId })
            });

            const data = await response.json();
            if (data.success) {
                await AsyncStorage.setItem('student_user', JSON.stringify({
                    email: email.toLowerCase().trim(),
                    deviceId
                }));
                navigation.replace('StudentDashboard');
            } else {
                Alert.alert('Registration Failed', data.error || 'Failed to register device.');
            }
        } catch (error) {
            Alert.alert('Network Error', 'Check your connection or server URL.');
        } finally {
            setLoading(false);
        }
    };

    if (checking) return <View style={styles.container}><ActivityIndicator color="#6366f1" size="large" /></View>;

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <Text style={styles.emoji}>🎓</Text>
                    <Text style={styles.title}>Student Sign In</Text>
                    <Text style={styles.subtitle}>Use your college email to register</Text>
                </View>

                <View style={styles.card}>
                    <View style={styles.warningBox}>
                        <Text style={styles.warningIcon}>🔒</Text>
                        <Text style={styles.warningText}>This phone will be permanently bound to your email. One phone per student — no sharing allowed.</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>College Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 2023ugcs045@nitjsr.ac.in"
                            placeholderTextColor="#475569"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            textContentType="emailAddress"
                            autoComplete="email"
                        />
                        <Text style={styles.hint}>Must be your official @nitjsr.ac.in email</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.signInBtn, loading && styles.signInBtnDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.signInBtnText}>Sign In & Register Device</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => navigation.navigate('RoleSelection')} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back to Role Selection</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 60, paddingBottom: 40 },
    header: { alignItems: 'center', marginBottom: 32 },
    emoji: { fontSize: 56, marginBottom: 16 },
    title: { fontSize: 30, fontWeight: '800', color: '#f8fafc', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#94a3b8', textAlign: 'center' },
    card: { backgroundColor: '#1e293b', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#334155', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10 },
    warningBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.08)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', padding: 14, borderRadius: 12, marginBottom: 24, gap: 12 },
    warningIcon: { fontSize: 24 },
    warningText: { flex: 1, color: '#fca5a5', fontSize: 12, fontWeight: '500', lineHeight: 18 },
    inputGroup: { marginBottom: 20 },
    label: { color: '#94a3b8', fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
    input: { backgroundColor: '#0f172a', borderWidth: 1.5, borderColor: '#334155', borderRadius: 12, padding: 16, color: '#f1f5f9', fontSize: 16 },
    hint: { color: '#64748b', fontSize: 12, marginTop: 6, fontWeight: '500' },
    signInBtn: { backgroundColor: '#6366f1', padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 8, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    signInBtnDisabled: { opacity: 0.6 },
    signInBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
    backBtn: { marginTop: 24, paddingVertical: 12 },
    backText: { color: '#64748b', textAlign: 'center', fontWeight: '600', fontSize: 14 },
});

```

### `src/screens/StudentScannerScreen.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { DEFAULT_SERVER_URL, APP_SECRET_HEADER, APP_SECRET_KEY } from '../config';
import * as ImagePicker from 'expo-image-picker';

export default function StudentScannerScreen({ navigation }: any) {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    const [studentInfo, setStudentInfo] = useState<{ email: string, deviceId: string } | null>(null);
    const [message, setMessage] = useState('Aim camera at the Teacher\'s QR Code');

    useEffect(() => {
        (async () => {
            const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
            const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
            setHasPermission(cameraStatus === 'granted' && locationStatus === 'granted');

            const savedString = await AsyncStorage.getItem('student_user');
            if (savedString) {
                setStudentInfo(JSON.parse(savedString));
            } else {
                navigation.replace('StudentLogin');
            }
        })();
    }, []);

    const handleBarcodeScanned = async ({ type, data }: { type: string, data: string }) => {
        if (scanned || !studentInfo) return;
        setScanned(true);

        try {
            await processQRData(data);
        } catch (error: any) {
            Alert.alert('Network Error', error.message || 'Failed to submit attendance.');
            setScanned(false);
            setMessage('Network error. Try scanning again.');
        }
    };

    const processQRData = async (data: string) => {
        if (!studentInfo) return;

        // Validate it's an attendance QR code
        const match = data.match(/\/s\/([a-zA-Z0-9_-]+)/);
        if (!match) {
            setMessage('Invalid QR code scanned. Try again.');
            setTimeout(() => setScanned(false), 3000);
            return;
        }

        const sessionCode = match[1];
        setMessage('📍 Getting Location...');

        // Geolocation Fetch with Mock Location detection
        let location;
        try {
            location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            
            // [SECURITY] Detect mock location / GPS spoofing
            if (location.mocked) {
                Alert.alert('Access Denied', 'GPS spoofing detected. Use your physical location.');
                setScanned(false);
                setMessage('GPS Spoofing detected');
                return;
            }
        } catch (err) {
            setMessage('Failed to get Location. Retrying...');
            location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        }

        setMessage('⏳ Submitting Attendance...');

        // [SECURITY] Cryptographic Request Signing & Integrity Verification (Issue #8)
        const timestamp = Date.now().toString();
        const payload = studentInfo.email.toLowerCase().trim() + studentInfo.deviceId + sessionCode;
        const signature = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            payload + timestamp + APP_SECRET_KEY
        );

        // Submit to specifically the React Native mobile API
        const res = await fetch(`${DEFAULT_SERVER_URL}/api/student/submit`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                ...APP_SECRET_HEADER,
                'x-signature': signature,
                'x-timestamp': timestamp
            },
            body: JSON.stringify({
                email: studentInfo.email,
                deviceId: studentInfo.deviceId,
                sessionCode: sessionCode,
                lat: location.coords.latitude,
                lon: location.coords.longitude
            })
        });

        const responseText = await res.text();
        let resultData;
        try { resultData = JSON.parse(responseText); } catch (e) { throw new Error('Crashed: ' + responseText); }


        if (resultData.success) {
            Alert.alert('✅ Attendance Recorded!', 'You are marked present for this session.', [
                { text: 'OK', onPress: () => setScanned(false) }
            ]);
            setMessage('Success! Ready to scan again.');
        } else {
            Alert.alert('Attendance Failed', resultData.error || 'Unknown error occurred.', [
                { text: 'Try Again', onPress: () => setScanned(false) }
            ]);
            setMessage('Failed. Try scanning again.');
        }
    };

    const processImageWithServer = async (uri: string) => {
        try {
            setMessage('Uploading image for scanning...');
            const formData = new FormData();
            formData.append('qrimage', {
                uri,
                name: 'scan.jpg',
                type: 'image/jpeg'
            } as any);

            const res = await fetch(`${DEFAULT_SERVER_URL}/api/student/decode-qr`, {
                method: 'POST',
                headers: APP_SECRET_HEADER,
                body: formData
            });
            const data = await res.json();

            if (data.success && data.data) {
                await processQRData(data.data);
            } else {
                Alert.alert('No QR Found', data.error || 'Failed to detect a QR code in the image.');
                setScanned(false);
                setMessage('Ready to scan');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to reach server for decoding.');
            setScanned(false);
            setMessage('Ready to scan');
        }
    };

    const uploadFromGallery = async () => {
        if (scanned || !studentInfo) return;
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setScanned(true);
                await processImageWithServer(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to process gallery image.');
            setScanned(false);
            setMessage('Ready to scan');
        }
    };

    if (hasPermission === null) {
        return <View style={styles.container}><Text style={styles.text}>Requesting permissions...</Text></View>;
    }
    if (hasPermission === false) {
        return <View style={styles.container}><Text style={styles.text}>No access to camera or location. Please allow in settings.</Text></View>;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.logoutBtn}>
                    <Text style={styles.logoutText}>← Dashboard</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Scan Session QR</Text>
                <View style={{ width: 60 }} />
            </View>

            <View style={styles.cameraFrame}>
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ["qr"],
                    }}
                >
                    <View style={styles.overlay}>
                        <View style={styles.unfocusedContainer} />
                        <View style={styles.middleContainer}>
                            <View style={styles.unfocusedContainer} />
                            <View style={styles.focusedContainer} />
                            <View style={styles.unfocusedContainer} />
                        </View>
                        <View style={styles.unfocusedContainer} />
                    </View>
                </CameraView>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>{studentInfo?.email}</Text>
                <Text style={[styles.statusText, scanned && { color: '#f59e0b' }, { marginBottom: 16 }]}>{message}</Text>

                <TouchableOpacity style={styles.uploadBtn} onPress={uploadFromGallery} disabled={scanned}>
                    <Text style={styles.uploadBtnText}>🖼️ Upload QR from Gallery</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    text: { color: 'white', alignSelf: 'center', marginTop: '50%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
    logoutBtn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#1e293b', borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
    logoutText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
    cameraFrame: { flex: 1, overflow: 'hidden' },
    overlay: { flex: 1, backgroundColor: 'transparent' },
    unfocusedContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
    middleContainer: { flexDirection: 'row', flex: 1.5 },
    focusedContainer: { flex: 6, borderWidth: 2, borderColor: '#22c55e', backgroundColor: 'transparent' },
    footer: { padding: 30, backgroundColor: '#0f172a', alignItems: 'center' },
    footerText: { color: '#94a3b8', fontSize: 13, marginBottom: 8, fontWeight: '500' },
    statusText: { color: '#22c55e', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
    uploadBtn: { width: '100%', backgroundColor: '#1e293b', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
    uploadBtnText: { color: '#f1f5f9', fontSize: 14, fontWeight: '700' }
});

```

### `tsconfig.json`

```json
{
    "extends": "expo/tsconfig.base",
    "compilerOptions": {
        "strict": true
    }
}
```



---

## 5. API DOCUMENTATION
**Base URL**: Google Apps Script Web App URL.

### `GET /`
- **Purpose**: Serve Student HTML form or execute REST API calls.
- **Query Params**: `action` (optional).
    - `?action=getResponses&sessionName=X`: Returns JSON of attendance.
    - `?action=getStatus`: Returns current active session status.
    - `?action=ping`: Returns `{ status: 'ok' }`.
    - No action: Returns Student HTML Form.

### `POST /`
- **Purpose**: Handles student submissions and teacher operations.
- **Student Submission (HTML Form)**:
    - **Headers**: `Content-Type: application/x-www-form-urlencoded`
    - **Body**: `email=X&name=Y&submit=true`
- **Teacher API Calls (JSON)**:
    - **Headers**: `Content-Type: application/json`
    - **Body (Start Session)**: `{ "action": "startSession", "sessionName": "..." }`
    - **Body (Stop Session)**: `{ "action": "stopSession" }`

---

## 6. DATABASE SCHEMA

Data is stored in Google Sheets (`SHEET_ID` and `ROLL_MAP_ID`).

**Table 1: Attendance**
- `Email` (String, Primary identifier for student)
- `Roll Number` (String, Foreign Key retrieved from Map)
- `Session Name` (String, Index dimension)
- `Date` (String, Formatted dd/MM/yyyy)
- `Time` (String, Formatted HH:mm:ss)
- `Timestamp` (String, ISO string format)

**Table 2: RollMap**
- `Email` (String, Primary Key)
- `RollNumber` (String)

---

## 7. CURRENT FEATURES
- **Teacher flow**: 
  1. Teacher logs into app.
  2. Teacher starts session (API POST `startSession`).
  3. App generates QR code linked to the active Google Apps Script web form.
  4. Teacher can monitor live responses via API GET `getResponses`.
  5. Teacher stops session when done.
- **Student flow**: 
  1. Scans Teacher's QR code.
  2. Opens web page (Google Apps Script Form).
  3. Submits Email and Name.
  4. Script maps roll number and verifies if the session is active. Attendance logged automatically.

---

## 8. KNOWN ISSUES & LIMITATIONS
- **Security Check Bypass**: Environment `APP_SECRET_KEY` exists in the React Native App but is currently not actively enforced in `Code.gs` (Google Apps Script).
- **Concurrency**: Google Sheets appending may face rate limits if >50 students submit simultaneously within seconds.
- **Missing File**: The `server` directory (Node/Express backend) mentioned in the docs has been replaced with the `apps-script` deployment, causing mismatched documentation trails.

---

## 9. PLANNED FEATURES
- Admin platform for uploading student info via Excel.
- Course management (replacing freetext subject with dropdown).
- Student-course enrollment mapping.
- Weekly attendance reports via email.
- Low attendance alerts with adjustable threshold.
- Photo upload per student for anti-proxy verification.
- Face verification at scan time.

---

## 10. ENVIRONMENT VARIABLES & SECRETS
- `EXPO_ACCOUNT`: Selects the EAS project context (`ignisight` or `nexisight`).
- `APP_SECRET_KEY`: Used to authenticate API requests between the app and the backend.

---

## 11. BUILD & DEPLOYMENT INSTRUCTIONS
### Backend Deployment (Google Apps Script)
1. Go to `script.google.com` and create New Project.
2. Paste contents of `apps-script/Code.gs`.
3. Run `initialSetup()` once and authorize.
4. Deploy as "Web app" (Execute as Me, Who has access: Anyone).
5. Copy the Web App URL into `src/config.ts`.

### Local Mobile App Run
```bash
npm install
npx expo start
```

### Cloud APK Build
```bash
npx eas-cli build --platform android --profile preview
```
---
