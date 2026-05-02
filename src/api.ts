import { DEFAULT_SERVER_URL, getSecureHeaders } from './config';
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
        const payload = JSON.stringify({ name, email, password, college, department, allowedDomain });
        const response = await fetch(`${SERVER_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(await getSecureHeaders(payload)) },
            body: payload,
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
        const payload = JSON.stringify({ email, password });
        const response = await fetch(`${SERVER_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(await getSecureHeaders(payload)) },
            body: payload,
        });
        return await response.json();
    } catch (error) {
        console.error("Login Error:", error);
        return { success: false, error: "Network error" };
    }
};

export async function forgotPassword(email: string) {
    const payload = JSON.stringify({ email });
    const res = await fetch(`${SERVER_URL}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getSecureHeaders(payload)) },
        body: payload,
    });
    return await res.json();
}

export async function resetPassword(email: string, otp: string, newPassword: string) {
    const payload = JSON.stringify({ email, otp, newPassword });
    const res = await fetch(`${SERVER_URL}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getSecureHeaders(payload)) },
        body: payload,
    });
    return await res.json();
}

// Change Password
export const changePassword = async (email: string, currentPassword: string, newPassword: string) => {
    try {
        const payload = JSON.stringify({ email, currentPassword, newPassword });
        const response = await fetch(`${SERVER_URL}/api/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(await getSecureHeaders(payload)) },
            body: payload,
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: "Network error" };
    }
};

// Update Profile
export const updateProfile = async (email: string, name: string, college: string, department: string, allowedDomain: string) => {
    try {
        const payload = JSON.stringify({ email, name, college, department, allowedDomain });
        const response = await fetch(`${SERVER_URL}/api/update-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(await getSecureHeaders(payload)) },
            body: payload,
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

export async function startSession(
    sessionName: string, 
    lat?: number, 
    lon?: number, 
    teacherEmail?: string,
    durationMins?: number,
    radiusMeters?: number,
    courseId?: string,
    joinWindowMins?: number
) {
    const payload = JSON.stringify({ 
        sessionName, lat, lon, teacherEmail,
        durationMins: durationMins || 60,
        radiusMeters: radiusMeters || 80,
        courseId,
        joinWindowMins: joinWindowMins || 10
    });
    const res = await fetch(`${SERVER_URL}/api/start-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getSecureHeaders(payload)) },
        body: payload,
    });
    return await res.json();
}

// Fetch courses assigned to a teacher (from MongoDB)
export async function getTeacherCourses(teacherEmail: string) {
    try {
        const res = await fetch(
            `${SERVER_URL}/api/teacher/my-courses?teacherEmail=${encodeURIComponent(teacherEmail)}`,
            { headers: await getSecureHeaders() }
        );
        return await res.json();
    } catch {
        return { success: false, error: 'Network error' };
    }
}

// Fetch enrolled courses + attendance % for a student
export async function getStudentCourses(email: string) {
    try {
        const res = await fetch(
            `${SERVER_URL}/api/student/courses?email=${encodeURIComponent(email)}`,
            { headers: await getSecureHeaders() }
        );
        return await res.json();
    } catch {
        return { success: false, error: 'Network error' };
    }
}

// Register face with Anti-Spoofing
export async function registerFace(email: string, deviceId: string, image: string) {
    try {
        const payload = JSON.stringify({ email, deviceId, image });
        const res = await fetch(`${SERVER_URL}/api/student/register-face`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(await getSecureHeaders(payload)) },
            body: payload,
        });
        return await res.json();
    } catch {
        return { success: false, error: 'Network error during face registration' };
    }
}

// Fetch face configuration (descriptor) from server
export async function getFaceConfig(email: string) {
    try {
        const res = await fetch(
            `${SERVER_URL}/api/student/face-config?email=${encodeURIComponent(email)}`,
            { headers: await getSecureHeaders() }
        );
        return await res.json();
    } catch {
        return { success: false, error: 'Network error' };
    }
}

// Sync face descriptor to server
export async function syncFaceDescriptor(email: string, descriptor: number[]) {
    try {
        const payload = JSON.stringify({ email, descriptor });
        const res = await fetch(`${SERVER_URL}/api/student/sync-face-descriptor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(await getSecureHeaders(payload)) },
            body: payload,
        });
        return await res.json();
    } catch {
        return { success: false, error: 'Network error' };
    }
}

export async function stopSession(sessionId?: number) {
    let url = `${SERVER_URL}/api/stop-session`;
    if (sessionId) url = `${SERVER_URL}/api/sessions/${sessionId}/stop`;

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getSecureHeaders('')) },
    });
    return await res.json();
}

export async function getResponses(sessionId?: number) {
    let url = `${SERVER_URL}/api/responses`;
    if (sessionId) {
        url += `?sessionId=${encodeURIComponent(sessionId)}`;
    }
    const res = await fetch(url, { headers: await getSecureHeaders() });
    return await res.json();
}

export async function pingServer(url: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`${url.replace(/\/+$/, '')}/api/status`, {
            headers: await getSecureHeaders(),
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
