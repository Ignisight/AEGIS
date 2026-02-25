// ==========================================
// Configuration
// ==========================================

// Server URL — your deployed Render server (Production)
export const DEFAULT_SERVER_URL = 'https://attendance-server-ddgs.onrender.com';

// Security: App Secret Key to block outside API requests (must match backend)
export const APP_SECRET_HEADER = { 'x-app-secret': 'attendance-system-v2-secure-key-2026' };

// Session duration in milliseconds (10 minutes)
export const SESSION_DURATION_MS = 10 * 60 * 1000;

// Auto-refresh interval for live responses (seconds)
export const REFRESH_INTERVAL_SEC = 10;
