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
