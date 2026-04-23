// =====================================================
// A.E.G.I.S — Automated Entry Geo-fenced Identification System
// Apps Script Backend — Self-Contained (No Google Forms needed)
// =====================================================
//
// SETUP (one-time, 2 minutes):
//   1. Go to script.google.com → New Project
//   2. Paste this entire code
//   3. Click Run → select "initialSetup" → Authorize
//   4. Run "initCourses" to create the Courses, TeacherCourses & LocationEvents sheets
//   5. Deploy → New deployment → Web app
//      - Execute as: Me
//      - Who has access: Anyone
//   6. Copy the Web App URL → paste into the teacher app config.ts
//   Done!
//
// =====================================================

function getProps() { return PropertiesService.getScriptProperties(); }

// ==========================================
// INITIAL SETUP — Run this once manually
// ==========================================
function initialSetup() {
  const ss    = SpreadsheetApp.create('A.E.G.I.S Attendance Records');
  const sheet = ss.getSheets()[0];
  sheet.setName('Attendance');
  sheet.getRange(1, 1, 1, 6).setValues([[
    'Email', 'Name', 'Roll Number', 'Session Name', 'Date', 'Time', 'Timestamp'
  ]]);
  sheet.setColumnWidth(1, 250);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 300);
  sheet.setColumnWidth(5, 120);
  sheet.setColumnWidth(6, 100);
  sheet.setColumnWidth(7, 200);
  sheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');

  const rollSS    = SpreadsheetApp.create('Roll Number Map');
  const rollSheet = rollSS.getSheets()[0];
  rollSheet.setName('RollMap');
  rollSheet.getRange(1, 1, 1, 2).setValues([['Email', 'RollNumber']]);
  rollSheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
  rollSheet.setColumnWidth(1, 250);
  rollSheet.setColumnWidth(2, 120);

  const props = getProps();
  props.setProperty('SHEET_ID',    ss.getId());
  props.setProperty('ROLL_MAP_ID', rollSS.getId());

  Logger.log('✅ Setup complete!');
  Logger.log('📊 Attendance Sheet: ' + ss.getUrl());
  Logger.log('📋 Roll Map Sheet:   ' + rollSS.getUrl());
  Logger.log('👉 Run initCourses() next.');
}

// ==========================================
// COURSES + LocationEvents SETUP
// ==========================================
function initCourses() {
  const sheetId = getProps().getProperty('SHEET_ID');
  if (!sheetId) { Logger.log('❌ Run initialSetup() first!'); return; }

  const ss = SpreadsheetApp.openById(sheetId);

  // ── Sheet: Courses ─────────────────────────────────────────────────
  const existingCourses = ss.getSheetByName('Courses');
  if (existingCourses) ss.deleteSheet(existingCourses);
  const coursesSheet = ss.insertSheet('Courses');
  coursesSheet.getRange(1, 1, 1, 3).setValues([['CourseID', 'CourseName', 'Semester']]);
  coursesSheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
  coursesSheet.setColumnWidth(1, 100);
  coursesSheet.setColumnWidth(2, 320);
  coursesSheet.setColumnWidth(3, 100);

  // ── Sheet: TeacherCourses ──────────────────────────────────────────
  const existingTC = ss.getSheetByName('TeacherCourses');
  if (existingTC) ss.deleteSheet(existingTC);
  const tcSheet = ss.insertSheet('TeacherCourses');
  tcSheet.getRange(1, 1, 1, 2).setValues([['TeacherEmail', 'CourseID']]);
  tcSheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#0f9d58').setFontColor('white');
  tcSheet.setColumnWidth(1, 260);
  tcSheet.setColumnWidth(2, 120);

  // ── Sheet: LocationEvents ──────────────────────────────────────────
  ensureLocationEventsSheet(ss);

  Logger.log('✅ Courses, TeacherCourses, and LocationEvents sheets created.');
}

function ensureLocationEventsSheet(ss) {
  if (ss.getSheetByName('LocationEvents')) return;
  const evSheet = ss.insertSheet('LocationEvents');
  evSheet.getRange(1, 1, 1, 6).setValues([['Email', 'SessionName', 'EventType', 'Timestamp', 'Lat', 'Lon']]);
  evSheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#e37400').setFontColor('white');
  evSheet.setColumnWidth(1, 250);
  evSheet.setColumnWidth(2, 300);
  evSheet.setColumnWidth(3, 100);
  evSheet.setColumnWidth(4, 200);
  evSheet.setColumnWidth(5, 120);
  evSheet.setColumnWidth(6, 120);
}

// ==========================================
// COURSES — Read courses assigned to a teacher
// ==========================================
function getCoursesForTeacher(teacherEmail) {
  const sheetId = getProps().getProperty('SHEET_ID');
  if (!sheetId) return { error: 'Sheet not set up. Run initialSetup() first.' };

  try {
    const ss           = SpreadsheetApp.openById(sheetId);
    const coursesSheet = ss.getSheetByName('Courses');
    if (!coursesSheet) return { error: 'Courses sheet not found. Run initCourses() first.' };

    const coursesData  = coursesSheet.getDataRange().getValues();
    const courseMap    = {};
    for (let i = 1; i < coursesData.length; i++) {
      const id   = (coursesData[i][0] || '').toString().trim();
      const name = (coursesData[i][1] || '').toString().trim();
      const sem  = (coursesData[i][2] || '').toString().trim();
      if (id) courseMap[id] = { courseName: name, semester: sem };
    }

    const tcSheet = ss.getSheetByName('TeacherCourses');
    if (!tcSheet) return { error: 'TeacherCourses sheet not found. Run initCourses() first.' };

    const tcData          = tcSheet.getDataRange().getValues();
    const normalizedEmail = (teacherEmail || '').trim().toLowerCase();
    const courses         = [];

    for (let i = 1; i < tcData.length; i++) {
      const rowEmail    = (tcData[i][0] || '').toString().trim().toLowerCase();
      const rowCourseId = (tcData[i][1] || '').toString().trim();
      if (rowEmail === normalizedEmail && rowCourseId && courseMap[rowCourseId]) {
        courses.push({
          courseId:   rowCourseId,
          courseName: courseMap[rowCourseId].courseName,
          semester:   courseMap[rowCourseId].semester,
        });
      }
    }

    return { success: true, courses: courses };
  } catch (err) {
    return { error: err.toString() };
  }
}

// ==========================================
// LOCATION EVENT LOGGING
// ==========================================
function logLocationEvent(data) {
  const sheetId = getProps().getProperty('SHEET_ID');
  if (!sheetId) return { error: 'Sheet not set up' };

  try {
    const ss = SpreadsheetApp.openById(sheetId);
    ensureLocationEventsSheet(ss);
    const evSheet = ss.getSheetByName('LocationEvents');

    // sessionCode is the short code; look up sessionName from currentSession if available
    const session     = getSessionState();
    const sessionName = session ? session.sessionName : (data.sessionCode || '');

    evSheet.appendRow([
      (data.email        || '').toString().toLowerCase().trim(),
      sessionName,
      (data.eventType    || '').toString(),
      (data.timestamp    || new Date().toISOString()).toString(),
      (data.lat          !== undefined ? data.lat : '').toString(),
      (data.lon          !== undefined ? data.lon : '').toString(),
    ]);

    return { success: true };
  } catch (err) {
    return { error: err.toString() };
  }
}

// ==========================================
// SMART EXPORT — with Status, Time In/Out, Duration
// ==========================================

/**
 * Produces a rich attendance summary for a given sessionName.
 * Returns array of objects:
 *   { email, name, rollNo, status, timeIn, timeOut, durationPresent }
 *
 * Status rules:
 *   "Full"       — student has no exit event logged
 *   "Left Early" — student exited but did NOT return (last event is 'exit')
 *   "Partial"    — student exited AND re-entered at least once (last event is 'entry')
 */
function buildAttendanceSummary(sessionNameFilter) {
  const sheetId = getProps().getProperty('SHEET_ID');
  if (!sheetId) return [];

  const ss = SpreadsheetApp.openById(sheetId);

  // ── Load Attendance base rows ────────────────────────────────────────
  const attSheet  = ss.getSheetByName('Attendance');
  const attData   = attSheet ? attSheet.getDataRange().getValues() : [];
  const attHeader = attData[0] || [];

  const emailIdx   = attHeader.indexOf('Email');
  const nameIdx    = attHeader.indexOf('Name');
  const rollIdx    = attHeader.indexOf('Roll Number');
  const sessIdx    = attHeader.indexOf('Session Name');
  const timeIdx    = attHeader.indexOf('Time');
  const dateIdx    = attHeader.indexOf('Date');

  const baseRows = {}; // email → { name, rollNo, timeIn }
  for (let i = 1; i < attData.length; i++) {
    const row     = attData[i];
    const sessVal = sessIdx >= 0 ? row[sessIdx].toString() : '';
    if (sessionNameFilter && sessVal !== sessionNameFilter) continue;

    const email = emailIdx >= 0 ? row[emailIdx].toString().toLowerCase().trim() : '';
    if (!email) continue;

    baseRows[email] = {
      email:  email,
      name:   nameIdx >= 0 ? row[nameIdx].toString() : '',
      rollNo: rollIdx >= 0 ? row[rollIdx].toString() : '',
      timeIn: timeIdx >= 0 ? row[timeIdx].toString() : '',
      date:   dateIdx >= 0 ? row[dateIdx].toString() : '',
    };
  }

  // ── Load LocationEvents for this session ─────────────────────────────
  const evSheet = ss.getSheetByName('LocationEvents');
  const evData  = evSheet ? evSheet.getDataRange().getValues() : [];
  const evHeader = evData[0] || [];

  const evEmailIdx = evHeader.indexOf('Email');
  const evSessIdx  = evHeader.indexOf('SessionName');
  const evTypeIdx  = evHeader.indexOf('EventType');
  const evTsIdx    = evHeader.indexOf('Timestamp');

  // Build per-student event list: email → [ {type, ts} ]
  const eventsByEmail = {};
  for (let i = 1; i < evData.length; i++) {
    const row     = evData[i];
    const sessVal = evSessIdx >= 0 ? row[evSessIdx].toString() : '';
    if (sessionNameFilter && sessVal !== sessionNameFilter) continue;

    const email = evEmailIdx >= 0 ? row[evEmailIdx].toString().toLowerCase().trim() : '';
    const type  = evTypeIdx  >= 0 ? row[evTypeIdx].toString()  : '';
    const ts    = evTsIdx    >= 0 ? row[evTsIdx].toString()    : '';
    if (!email) continue;

    if (!eventsByEmail[email]) eventsByEmail[email] = [];
    eventsByEmail[email].push({ type, ts });
  }

  // ── Compute summary ──────────────────────────────────────────────────
  const summary = [];
  for (const email of Object.keys(baseRows)) {
    const base   = baseRows[email];
    const events = eventsByEmail[email] || [];

    // Sort events chronologically
    events.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

    let status      = 'Full';
    let timeOut     = '';
    let durationMs  = 0; // ms spent inside

    if (events.length === 0) {
      // No location events → student stayed inside the whole time
      status = 'Full';
    } else {
      const lastEvent = events[events.length - 1];
      const hasExit   = events.some(e => e.type === 'exit');
      const hasReEntry = events.filter(e => e.type === 'entry').length > 0; // re-entries (not first scan)

      if (!hasExit) {
        status = 'Full';
      } else if (lastEvent.type === 'exit') {
        status   = 'Left Early';
        timeOut  = lastEvent.ts;
      } else {
        // last event is 'entry' after at least one 'exit'
        status = 'Partial';
      }

      // Calculate time present by walking event pairs
      // Assume student starts inside at timeIn, then track exit/entry flips
      let lastInsideTs = base.timeIn ? new Date(base.date + ' ' + base.timeIn).getTime() : 0;
      let currentlyInside = true;

      for (const ev of events) {
        const evTime = new Date(ev.ts).getTime();
        if (ev.type === 'exit' && currentlyInside) {
          // Leaving: accumulate time inside
          if (lastInsideTs && evTime > lastInsideTs) {
            durationMs += evTime - lastInsideTs;
          }
          currentlyInside = false;
        } else if (ev.type === 'entry' && !currentlyInside) {
          lastInsideTs    = evTime;
          currentlyInside = true;
        }
      }

      // If currently inside, duration up to "now" (we use current time as approximation)
      if (currentlyInside && lastInsideTs) {
        durationMs += Date.now() - lastInsideTs;
      }
    }

    // Format duration as HH:MM
    const totalMin = Math.floor(durationMs / 60000);
    const durHH    = Math.floor(totalMin / 60).toString().padStart(2, '0');
    const durMM    = (totalMin % 60).toString().padStart(2, '0');
    const durationPresent = durationMs > 0 ? `${durHH}:${durMM}` : (status === 'Full' ? 'Full session' : '');

    summary.push({
      email:           base.email,
      name:            base.name,
      rollNo:          base.rollNo,
      status:          status,
      timeIn:          base.timeIn,
      timeOut:         timeOut,
      durationPresent: durationPresent,
    });
  }

  return summary;
}

// ==========================================
// HTTP HANDLERS
// ==========================================

function doGet(e) {
  const action = e.parameter.action;

  if (action) {
    if (action === 'getResponses')   return jsonResponse(getResponses(e.parameter.sessionName));
    if (action === 'getStatus')      return jsonResponse(getStatus());
    if (action === 'ping')           return jsonResponse({ status: 'ok' });
    if (action === 'getCourses')     return jsonResponse(getCoursesForTeacher(e.parameter.teacherEmail));
    if (action === 'getSummary')     return jsonResponse({ success: true, summary: buildAttendanceSummary(e.parameter.sessionName) });
    return jsonResponse({ error: 'Unknown action' });
  }

  return serveStudentForm();
}

function doPost(e) {
  try {
    const contentType = e.postData ? e.postData.type : '';

    // ── SECRET KEY VERIFICATION (Issue #3) ──────────────────────────
    // The mobile app sends the secret in the JSON payload or headers
    // For GAS, we check if the incoming JSON data has the correct key
    const data = (contentType.indexOf('application/json') >= 0) ? JSON.parse(e.postData.contents) : null;
    const props = getProps();
    const SECRET_KEY = props.getProperty('APP_SECRET_KEY');

    // If a secret is configured in Script Properties, verify it
    if (SECRET_KEY && data && data.appSecret !== SECRET_KEY) {
      return jsonResponse({ error: 'Access Denied: Invalid Secret Key' });
    }

    if (contentType.indexOf('application/x-www-form-urlencoded') >= 0) {
      return handleStudentSubmission(e);
    }

    if (!data) return jsonResponse({ error: 'Invalid request format' });
    const action = data.action;

    if (action === 'startSession')  return jsonResponse(startSession(data.sessionName));
    if (action === 'stopSession')   return jsonResponse(stopSession());
    if (action === 'locationEvent') return jsonResponse(logLocationEvent(data));
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
  const session  = getSessionState();
  const isActive = session && session.active;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>A.E.G.I.S Attendance</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: #0f172a; color: #f1f5f9;
      min-height: 100vh; display: flex;
      justify-content: center; align-items: center; padding: 20px;
    }
    .card {
      background: #1e293b; border-radius: 20px; padding: 32px;
      width: 100%; max-width: 420px;
      box-shadow: 0 8px 32px rgba(99,102,241,0.15);
      border: 1px solid #334155;
    }
    .icon { font-size: 48px; text-align: center; margin-bottom: 16px; }
    h1   { text-align: center; font-size: 24px; margin-bottom: 4px; }
    .session-name { text-align:center; color:#6366f1; font-weight:600; font-size:14px; margin-bottom:24px; }
    .closed-msg   { text-align:center; color:#ef4444; font-size:16px; padding:20px 0; }
    .field { margin-bottom: 16px; }
    label  { display:block; font-size:14px; font-weight:600; color:#cbd5e1; margin-bottom:6px; }
    input[type="email"], input[type="text"] {
      width:100%; padding:14px 16px; border-radius:12px;
      border:1.5px solid #334155; background:#0f172a; color:#f1f5f9;
      font-size:16px; outline:none; transition:border-color 0.2s;
    }
    input:focus { border-color: #6366f1; }
    .note { font-size:12px; color:#64748b; margin-top:4px; }
    .btn  {
      width:100%; padding:16px; border:none; border-radius:14px;
      background:#6366f1; color:white; font-size:17px; font-weight:700;
      cursor:pointer; margin-top:8px; transition:opacity 0.2s;
    }
    .btn:hover    { opacity: 0.9; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .success      { text-align:center; padding:20px 0; }
    .success .check { font-size:64px; }
    .success h2  { color:#22c55e; margin:12px 0 4px; }
    .success p   { color:#94a3b8; font-size:14px; }
    #error { color:#ef4444; text-align:center; margin-top:12px; font-size:14px; display:none; }
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
                 placeholder="yourname@college.edu" pattern=".*@.*\\\\..*">
          <div class="note">Use your official college email</div>
        </div>
        <div class="field">
          <label>Full Name</label>
          <input type="text" id="name" name="name" required placeholder="Your full name">
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
      <h1>A.E.G.I.S Attendance</h1>
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
      var btn    = document.getElementById('submitBtn');
      var errDiv = document.getElementById('error');
      btn.disabled     = true;
      btn.textContent  = '⏳ Submitting...';
      errDiv.style.display = 'none';
      var formData = new URLSearchParams();
      formData.append('email',  document.getElementById('email').value.trim());
      formData.append('name',   document.getElementById('name').value.trim());
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
          errDiv.textContent   = data.error || 'Submission failed';
          errDiv.style.display = 'block';
          btn.disabled    = false;
          btn.textContent = '✅ Submit Attendance';
        }
      })
      .catch(function() {
        errDiv.textContent   = 'Network error. Please try again.';
        errDiv.style.display = 'block';
        btn.disabled    = false;
        btn.textContent = '✅ Submit Attendance';
      });
      return false;
    }
  </script>
  \` : ''}
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle('A.E.G.I.S Attendance')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ==========================================
// HANDLE STUDENT SUBMISSION
// ==========================================

function handleStudentSubmission(e) {
  const params = e.parameter;
  const email  = (params.email || '').trim().toLowerCase();
  const name   = (params.name  || '').trim();

  // ── 1. INPUT VALIDATION (Issue #6) ──────────────────────────────────
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: 'A valid college email is required' });
  }
  if (!name || name.length < 3 || name.length > 100) {
    return jsonResponse({ error: 'Please enter a valid name (3-100 characters)' });
  }
  if (name.includes('<') || name.includes('>')) {
    return jsonResponse({ error: 'Invalid characters in name' });
  }

  const session = getSessionState();
  if (!session || !session.active) return jsonResponse({ error: 'Session is closed' });

  // ── 2. TRANSACTION SAFETY / LOCKING (Issue #2) ──────────────────────
  const lock = LockService.getScriptLock();
  try {
    // Wait for up to 15 seconds for other submissions to finish
    lock.waitLock(15000);

    const sheetId = getProps().getProperty('SHEET_ID');
    const ss      = SpreadsheetApp.openById(sheetId);
    const sheet   = ss.getSheetByName('Attendance');
    const data    = sheet.getDataRange().getValues();

    // ── 3. DUPLICATE CHECK (Now inside the lock) ──────────────────────
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString().toLowerCase() === email &&
          data[i][3] === session.sessionName) {
        return jsonResponse({ error: 'You have already submitted for this session' });
      }
    }

    const rollNumber = lookupRollNumber(email);
    const now        = new Date();
    // Using ISO 8601 consistently for the last column (Issue #11)
    const dateStr    = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd/MM/yyyy');
    const timeStr    = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss');

    // Columns: Email, Name, Roll Number, Session Name, Date, Time, Timestamp
    sheet.appendRow([email, name, rollNumber, session.sessionName, dateStr, timeStr, now.toISOString()]);
    
    return jsonResponse({ success: true, message: 'Attendance recorded' });

  } catch (err) {
    return jsonResponse({ error: 'Server busy or error: ' + err.toString() });
  } finally {
    lock.releaseLock();
  }
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
  if (!sessionName || sessionName.trim() === '') return { error: 'Session name is required' };

  const sheetId = getProps().getProperty('SHEET_ID');
  if (!sheetId) return { error: 'Run initialSetup() first from the script editor' };

  setSessionState({ sessionName: sessionName.trim(), startedAt: new Date().toISOString(), active: true });

  let sheetUrl = '';
  try {
    sheetUrl = SpreadsheetApp.openById(sheetId).getUrl();
  } catch (e) {
    sheetUrl = 'https://docs.google.com/spreadsheets/d/' + sheetId;
  }

  return { success: true, sessionName: sessionName.trim(), sheetUrl: sheetUrl };
}

function stopSession() {
  const session = getSessionState();
  setSessionState({ ...session, active: false });
  return { success: true, message: 'Session stopped', sessionName: session ? session.sessionName : 'unknown' };
}

function getStatus() {
  return { session: getSessionState() };
}

function getResponses(sessionFilter) {
  const sheetId = getProps().getProperty('SHEET_ID');
  if (!sheetId) return { error: 'Sheet not set up' };

  try {
    const ss      = SpreadsheetApp.openById(sheetId);
    const sheet   = ss.getSheetByName('Attendance');
    const data    = sheet.getDataRange().getValues();

    if (data.length <= 1) return { success: true, headers: data[0] || [], responses: [], count: 0 };

    const headers    = data[0];
    const sessionCol = headers.indexOf('Session Name');
    const responses  = [];

    for (let i = 1; i < data.length; i++) {
      if (sessionFilter && sessionCol >= 0 && data[i][sessionCol] !== sessionFilter) continue;
      const row = {};
      for (let j = 0; j < headers.length; j++) row[headers[j]] = data[i][j];
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

    const ss   = SpreadsheetApp.openById(rollMapId);
    const data = ss.getSheets()[0].getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString().toLowerCase().trim() === email) return data[i][1].toString();
    }
    return 'NOT FOUND';
  } catch (err) {
    return 'LOOKUP ERROR';
  }
}
