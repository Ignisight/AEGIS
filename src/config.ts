// ==========================================
// Configuration
// ==========================================
import Constants from 'expo-constants';

// ─────────────────────────────────────────────────────────────────────────
// A.E.G.I.S Server URL
// Repo:    github.com/Ignisight/attendance-server  (local: E:\AG\AEGIS-Server)
// Deploy:  Render → service name "aegis-server"
// ⚠️  When you get a new Render URL, change ONLY this line then rebuild APK.
// ─────────────────────────────────────────────────────────────────────────
export const DEFAULT_SERVER_URL = 'https://attendance-server-ddgs.onrender.com'; // ← CHANGE THIS


// Security: App Secret Key injected at build time via app.config.js
// NEVER hardcode the actual key here — it comes from environment variables
export const APP_SECRET_KEY = Constants.expoConfig?.extra?.APP_SECRET_KEY || '';
export const APP_SECRET_HEADER = { 'x-app-secret': APP_SECRET_KEY };

// @deprecated — Session duration is now set by the teacher in the HomeScreen
// duration modal (HH.MM format) and passed via route.params.sessionDurationMs.
// This constant is no longer used by SessionScreen and will be removed in a future cleanup.
export const SESSION_DURATION_MS = 60 * 60 * 1000; // 1 hour fallback

// Auto-refresh interval for live responses (seconds)
export const REFRESH_INTERVAL_SEC = 10;
