const fs = require("fs");
const path = require("path");

const ROOT_DIR = process.cwd();
const OUTPUT_FILE = "Attendance_App_Full_Project_Brief.md";

// Directories/files to ignore for printing source code
const IGNORE_DIRS = ['.git', 'node_modules', '.expo', 'assets'];
const IGNORE_FILES = ['package-lock.json', 'attendance.apk', 'generate_brief.js', 'Attendance_App_Full_Project_Brief.md', 'Attendance_App_Full_Project_Brief.pdf', 'last_build.json'];

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory && !IGNORE_DIRS.includes(f)) {
            walkDir(dirPath, callback);
        } else if (!isDirectory && !IGNORE_FILES.includes(f) && !f.endsWith('.png') && !f.endsWith('.jpg') && !f.endsWith('.apk')) {
            callback(path.join(dir, f));
        }
    });
}

const allFiles = [];
walkDir(ROOT_DIR, (filePath) => {
    allFiles.push(filePath);
});

// Create File Structure Tree (Basic)
function generateTree() {
    let treeStr = "";
    allFiles.forEach(f => {
        treeStr += "- \`" + path.relative(ROOT_DIR, f).replace(/\\/g, '/') + "\`\n";
    });
    return treeStr;
}

// Create Source Code Blocks
function generateCodeBlocks() {
    let blocks = "";
    allFiles.forEach(f => {
        const ext = path.extname(f).slice(1) || 'text';
        const content = fs.readFileSync(f, 'utf8');
        blocks += `### \`${path.relative(ROOT_DIR, f).replace(/\\/g, '/')}\`\n\n\`\`\`${ext}\n${content}\n\`\`\`\n\n`;
    });
    return blocks;
}

const markdownContent = `
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
- **Frontend**: React Native, Expo SDK 54, TypeScript, React Navigation. Includes \`expo-location\`, \`expo-camera\`, and \`expo-crypto\`.
- **Backend**: Google Apps Script (JavaScript) acting as API Server and Web UI.
- **Database**: Google Sheets (managed by App Script) with \`Attendance\` and \`RollMap\` sheets.
- **Third-Party Services**: EAS Build (Expo Application Services).

---

## 3. FULL FILE STRUCTURE
${generateTree()}

*(Note: Ignoring \`node_modules\`, \`assets\`, \`.expo\`, and binary/lock files for clarity).*

---

## 4. FULL SOURCE CODE

${generateCodeBlocks()}

---

## 5. API DOCUMENTATION
**Base URL**: Google Apps Script Web App URL.

### \`GET /\`
- **Purpose**: Serve Student HTML form or execute REST API calls.
- **Query Params**: \`action\` (optional).
    - \`?action=getResponses&sessionName=X\`: Returns JSON of attendance.
    - \`?action=getStatus\`: Returns current active session status.
    - \`?action=ping\`: Returns \`{ status: 'ok' }\`.
    - No action: Returns Student HTML Form.

### \`POST /\`
- **Purpose**: Handles student submissions and teacher operations.
- **Student Submission (HTML Form)**:
    - **Headers**: \`Content-Type: application/x-www-form-urlencoded\`
    - **Body**: \`email=X&name=Y&submit=true\`
- **Teacher API Calls (JSON)**:
    - **Headers**: \`Content-Type: application/json\`
    - **Body (Start Session)**: \`{ "action": "startSession", "sessionName": "..." }\`
    - **Body (Stop Session)**: \`{ "action": "stopSession" }\`

---

## 6. DATABASE SCHEMA

Data is stored in Google Sheets (\`SHEET_ID\` and \`ROLL_MAP_ID\`).

**Table 1: Attendance**
- \`Email\` (String, Primary identifier for student)
- \`Roll Number\` (String, Foreign Key retrieved from Map)
- \`Session Name\` (String, Index dimension)
- \`Date\` (String, Formatted dd/MM/yyyy)
- \`Time\` (String, Formatted HH:mm:ss)
- \`Timestamp\` (String, ISO string format)

**Table 2: RollMap**
- \`Email\` (String, Primary Key)
- \`RollNumber\` (String)

---

## 7. CURRENT FEATURES
- **Teacher flow**: 
  1. Teacher logs into app.
  2. Teacher starts session (API POST \`startSession\`).
  3. App generates QR code linked to the active Google Apps Script web form.
  4. Teacher can monitor live responses via API GET \`getResponses\`.
  5. Teacher stops session when done.
- **Student flow**: 
  1. Scans Teacher's QR code.
  2. Opens web page (Google Apps Script Form).
  3. Submits Email and Name.
  4. Script maps roll number and verifies if the session is active. Attendance logged automatically.

---

## 8. KNOWN ISSUES & LIMITATIONS
- **Security Check Bypass**: Environment \`APP_SECRET_KEY\` exists in the React Native App but is currently not actively enforced in \`Code.gs\` (Google Apps Script).
- **Concurrency**: Google Sheets appending may face rate limits if >50 students submit simultaneously within seconds.
- **Missing File**: The \`server\` directory (Node/Express backend) mentioned in the docs has been replaced with the \`apps-script\` deployment, causing mismatched documentation trails.

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
- \`EXPO_ACCOUNT\`: Selects the EAS project context (\`ignisight\` or \`nexisight\`).
- \`APP_SECRET_KEY\`: Used to authenticate API requests between the app and the backend.

---

## 11. BUILD & DEPLOYMENT INSTRUCTIONS
### Backend Deployment (Google Apps Script)
1. Go to \`script.google.com\` and create New Project.
2. Paste contents of \`apps-script/Code.gs\`.
3. Run \`initialSetup()\` once and authorize.
4. Deploy as "Web app" (Execute as Me, Who has access: Anyone).
5. Copy the Web App URL into \`src/config.ts\`.

### Local Mobile App Run
\`\`\`bash
npm install
npx expo start
\`\`\`

### Cloud APK Build
\`\`\`bash
npx eas-cli build --platform android --profile preview
\`\`\`
---
`;

fs.writeFileSync(OUTPUT_FILE, markdownContent);
console.log("Markdown generation complete: " + OUTPUT_FILE);
