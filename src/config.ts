// ==========================================
// Configuration
// ==========================================
import Constants from 'expo-constants';

// ─────────────────────────────────────────────────────────────────────────
// A.E.G.I.S Server URL
// Repo:    github.com/Ignisight/attendance-server  (local: E:\AG\AEGIS-Server)
// Deploy:  Render → service name "aegis-server"
// ⚠️  Updated for production build.
// ─────────────────────────────────────────────────────────────────────────
export const DEFAULT_SERVER_URL = 'https://aegis-server-02y5.onrender.com'; // ← NEW LIVE URL


// Security: App Secret Key injected at build time via app.config.js
// NEVER hardcode the actual key here — it comes from environment variables
export const APP_SECRET_KEY = Constants.expoConfig?.extra?.APP_SECRET_KEY || '';
import * as Crypto from 'expo-crypto';

// Replay Protection: Generate a dynamic, expiring signature per request
export const getSecureHeaders = async () => {
    const timestamp = Date.now().toString();
    const nonce = Math.random().toString(36).substring(2, 15);
    const signature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        timestamp + nonce + APP_SECRET_KEY
    );
    return {
        'x-app-secret': APP_SECRET_KEY, // Kept for backwards compatibility if needed
        'x-timestamp': timestamp,
        'x-nonce': nonce,
        'x-signature': signature
    };
};

// Persistence Keys
export const FACE_DESCRIPTOR_KEY = 'aegis_face_descriptor';

// @deprecated — Session duration is now set by the teacher in the HomeScreen
// duration modal (HH.MM format) and passed via route.params.sessionDurationMs.
// This constant is no longer used by SessionScreen and will be removed in a future cleanup.
export const SESSION_DURATION_MS = 60 * 60 * 1000; // 1 hour fallback

// Auto-refresh interval for live responses (seconds)
export const REFRESH_INTERVAL_SEC = 10;
