/**
 * StudentScannerScreen.tsx
 *
 * Background-safe geofence tracking using expo-task-manager +
 * Location.startLocationUpdatesAsync (Android foreground service).
 *
 * Architecture:
 *   - On successful scan → store session meta in AsyncStorage
 *   - Start Location.startLocationUpdatesAsync (OS keeps this alive via notification)
 *   - Background task (GEOFENCE_TASK) runs every 60 s:
 *       haversine check → only POST to server on status flip
 *   - UI polls AsyncStorage every 5 s (cheap) to update badge — no GPS
 *   - On unmount / session expiry → stop location task, clean AsyncStorage
 *
 * Server is hit ONLY on exit | entry, never on stable state.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { DEFAULT_SERVER_URL, APP_SECRET_HEADER, APP_SECRET_KEY } from '../config';
import FaceVerifyWebView from '../components/FaceVerifyWebView';
import { FACE_DESCRIPTOR_KEY } from './FaceSetupScreen';

// ── Task & Storage Keys ────────────────────────────────────────────────────
const GEOFENCE_TASK      = 'aegis-geofence-task';
const SESSION_META_KEY   = 'aegis_session_meta';
const LAST_STATUS_KEY    = 'aegis_geofence_last_status'; // 'true' | 'false'

// ── Geo helper (pure, safe in task context) ────────────────────────────────
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R  = 6371000;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ═══════════════════════════════════════════════════════════════════════════
// BACKGROUND TASK — defined at MODULE LEVEL (Expo requirement)
// Runs in foreground service context; JS thread kept alive by OS notification
// ═══════════════════════════════════════════════════════════════════════════
TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }: any) => {
    if (error) return; // silent

    const locations: Location.LocationObject[] = data?.locations ?? [];
    const location = locations[0];
    if (!location) return;

    try {
        // ── Read session meta from AsyncStorage ────────────────────────────
        const metaStr = await AsyncStorage.getItem(SESSION_META_KEY);
        if (!metaStr) {
            // No active session — stop the task
            await Location.stopLocationUpdatesAsync(GEOFENCE_TASK).catch(() => {});
            return;
        }
        const meta = JSON.parse(metaStr);

        // ── Session expiry check ──────────────────────────────────────────
        if (Date.now() >= meta.expiresAt) {
            await Location.stopLocationUpdatesAsync(GEOFENCE_TASK).catch(() => {});
            await AsyncStorage.multiRemove([SESSION_META_KEY, LAST_STATUS_KEY]);
            return;
        }

        // ── Local geofence computation ────────────────────────────────────
        const dist            = haversineDistance(
            location.coords.latitude,
            location.coords.longitude,
            meta.lat,
            meta.lon
        );
        const currentlyInside = dist <= meta.radius;

        // ── Read previous status ──────────────────────────────────────────
        const lastStatusStr  = await AsyncStorage.getItem(LAST_STATUS_KEY);
        const lastStatus     = lastStatusStr !== null ? lastStatusStr === 'true' : null;
        const statusFlipped  = lastStatus !== null && lastStatus !== currentlyInside;

        // ── Save new status (UI polls this) ───────────────────────────────
        await AsyncStorage.setItem(LAST_STATUS_KEY, String(currentlyInside));

        // ── Server call ONLY on flip ──────────────────────────────────────
        if (statusFlipped) {
            const eventType = currentlyInside ? 'entry' : 'exit';
            await fetch(`${meta.serverUrl}/api/student/location-event`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-app-secret': meta.appSecret,
                },
                body: JSON.stringify({
                    email:       meta.email,
                    deviceId:    meta.deviceId,
                    sessionCode: meta.sessionCode,
                    eventType,
                    lat:         location.coords.latitude,
                    lon:         location.coords.longitude,
                    timestamp:   new Date().toISOString(),
                }),
            }).catch(() => { /* silent — never crash the task */ });
        }
    } catch {
        // Any unexpected error — log nothing, never crash
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
interface StudentInfo {
    email: string;
    deviceId: string;
    name?: string;
}

export default function StudentScannerScreen({ navigation }: any) {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned]             = useState(false);
    const [studentInfo, setStudentInfo]     = useState<StudentInfo | null>(null);
    const [message, setMessage]             = useState("Aim camera at the Teacher's QR Code");

    // Tracking state (updated by UI polling AsyncStorage, not GPS)
    const [tracking, setTracking]   = useState(false);
    const [inRange, setInRange]     = useState<boolean | null>(null);

    // Ref mirrors for use inside intervals/callbacks
    const studentInfoRef = useRef<StudentInfo | null>(null);
    const uiPollRef      = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Face verification state ────────────────────────────────────────────
    // Stores everything needed for server submit, set after location is fetched.
    // Face verification happens before the server is ever called.
    const [pendingAttendance, setPendingAttendance] = useState<{
        sessionCode: string;
        location: Location.LocationObject;
        timestamp: string;
        signature: string;
    } | null>(null);
    const [faceSelfieb64, setFaceSelfieb64]       = useState<string | null>(null);
    const [faceVerifying, setFaceVerifying]       = useState(false);
    const [showSelfieModal, setShowSelfieModal]   = useState(false);
    const [faceStatusMsg, setFaceStatusMsg]       = useState('');
    const [refDescriptor, setRefDescriptor]       = useState<number[] | null>(null);

    // ── Boot ────────────────────────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            // Request foreground camera + location
            const { status: camStatus } = await Camera.requestCameraPermissionsAsync();
            const { status: fgStatus }  = await Location.requestForegroundPermissionsAsync();

            // Request background location (Android 10+)
            let bgGranted = false;
            try {
                const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
                bgGranted = bgStatus === 'granted';
            } catch {
                // Not supported on this OS — will fall back to foreground-only
            }

            setHasPermission(camStatus === 'granted' && fgStatus === 'granted');

            if (fgStatus === 'granted' && !bgGranted) {
                // Warn once — app will still work but tracking stops when screen locks
                console.warn('[AEGIS] Background location not granted. Tracking requires app to stay open.');
            }

            // Load student
            const savedString = await AsyncStorage.getItem('student_user');
            if (savedString) {
                const parsed = JSON.parse(savedString);
                setStudentInfo(parsed);
                studentInfoRef.current = parsed;
            } else {
                navigation.replace('StudentLogin');
            }

            // Load reference face descriptor
            const descStr = await AsyncStorage.getItem(FACE_DESCRIPTOR_KEY);
            if (descStr) setRefDescriptor(JSON.parse(descStr));
        })();
    }, []);

    // ── Cleanup on unmount ─────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (uiPollRef.current) clearInterval(uiPollRef.current);
            // Do NOT stop location task here — let it run in background
            // It will stop itself when session expires or no meta found
        };
    }, []);

    // ── Start background tracking ──────────────────────────────────────────
    const startBackgroundTracking = async (meta: {
        sessionCode: string;
        lat: number;
        lon: number;
        radius: number;
        expiresAt: number;
        serverUrl: string;
        appSecret: string;
        email: string;
        deviceId: string;
    }) => {
        // Store all task-needed data in AsyncStorage (task runs in isolated context)
        await AsyncStorage.setItem(SESSION_META_KEY, JSON.stringify(meta));
        await AsyncStorage.setItem(LAST_STATUS_KEY, 'true'); // initial: inside

        // Update UI immediately
        setTracking(true);
        setInRange(true);

        // Stop any existing task first (safety)
        const isRunning = await Location.hasStartedLocationUpdatesAsync(GEOFENCE_TASK).catch(() => false);
        if (isRunning) {
            await Location.stopLocationUpdatesAsync(GEOFENCE_TASK).catch(() => {});
        }

        // Start OS-managed location updates with a foreground service notification
        await Location.startLocationUpdatesAsync(GEOFENCE_TASK, {
            accuracy:                    Location.Accuracy.Balanced,
            timeInterval:                60000,   // 60 seconds
            distanceInterval:            0,        // time-based, not distance
            pausesUpdatesAutomatically:  false,    // never pause
            showsBackgroundLocationIndicator: true, // iOS blue bar
            foregroundService: {
                notificationTitle: 'A.E.G.I.S — Attendance Active',
                notificationBody:  'Verifying your classroom location. Do not close.',
                notificationColor: '#6366f1',
            },
        });

        // ── UI poll: reads AsyncStorage every 5 s — NO GPS, extremely cheap ──
        uiPollRef.current = setInterval(async () => {
            // Check if session is still alive
            const metaStr = await AsyncStorage.getItem(SESSION_META_KEY).catch(() => null);
            if (!metaStr) {
                clearInterval(uiPollRef.current!);
                setTracking(false);
                return;
            }
            const m = JSON.parse(metaStr);
            if (Date.now() >= m.expiresAt) {
                clearInterval(uiPollRef.current!);
                setTracking(false);
                await Location.stopLocationUpdatesAsync(GEOFENCE_TASK).catch(() => {});
                await AsyncStorage.multiRemove([SESSION_META_KEY, LAST_STATUS_KEY]);
                return;
            }
            // Read last known status written by the background task
            const statusStr = await AsyncStorage.getItem(LAST_STATUS_KEY).catch(() => null);
            if (statusStr !== null) {
                setInRange(statusStr === 'true');
            }
        }, 5000);
    };

    // ── QR scan ────────────────────────────────────────────────────────────
    const handleBarcodeScanned = async ({ data }: { type: string; data: string }) => {
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

        const match = data.match(/\/s\/([a-zA-Z0-9_-]+)/);
        if (!match) {
            setMessage('Invalid QR code scanned. Try again.');
            setTimeout(() => setScanned(false), 3000);
            return;
        }

        const sessionCode = match[1];
        setMessage('📍 Getting Location...');

        let location: Location.LocationObject;
        try {
            location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            if (location.mocked) {
                Alert.alert('Access Denied', 'GPS spoofing detected. Use your physical location.');
                setScanned(false);
                setMessage('GPS Spoofing detected');
                return;
            }
        } catch {
            setMessage('Failed to get Location. Retrying...');
            location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        }

        setMessage('📸 Face verification required...');
        setShowSelfieModal(true);

        // Store pending attendance data — server call happens AFTER face passes
        const timestamp = Date.now().toString();
        const payload   = studentInfo.email.toLowerCase().trim() + studentInfo.deviceId + sessionCode;
        const signature = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            payload + timestamp + APP_SECRET_KEY
        );
        setPendingAttendance({ sessionCode, location, timestamp, signature });
    };

    // ── Called after selfie is taken in the modal ─────────────────────────
    const takeSelfieForVerification = async () => {
        setShowSelfieModal(false);
        const result = await ImagePicker.launchCameraAsync({
            cameraType: ImagePicker.CameraType.front,
            quality: 0.85,
            base64: true,
            allowsEditing: true,
            aspect: [1, 1],
        });
        if (result.canceled || !result.assets?.[0]?.base64) {
            // User cancelled — reset scanner
            setPendingAttendance(null);
            setScanned(false);
            setMessage("Aim camera at the Teacher's QR Code");
            return;
        }
        setFaceSelfieb64(result.assets[0].base64!);
        setFaceStatusMsg('Verifying your identity…');
        setFaceVerifying(true); // mount FaceVerifyWebView
    };

    // ── Face verification result callbacks ────────────────────────────────
    const onFaceMatch = async (_match: boolean, score: number) => {
        setFaceVerifying(false);
        setFaceSelfieb64(null);
        if (score >= 0.6 || !_match) {
            // FACE MISMATCH — block completely
            setPendingAttendance(null);
            setScanned(false);
            setMessage("Aim camera at the Teacher's QR Code");
            Alert.alert(
                'Identity Mismatch',
                'Your face does not match the registered profile. Attendance NOT recorded.',
                [{ text: 'OK' }]
            );
            return;
        }
        // FACE MATCHED — now submit to server
        await submitAttendanceToServer();
    };

    const onFaceError = (errMsg: string) => {
        setFaceVerifying(false);
        setFaceSelfieb64(null);
        if (errMsg.includes('No face detected')) {
            // Specific feedback — retry selfie
            Alert.alert('No Face Detected', errMsg + ' Please try again.', [
                { text: 'Retry Selfie', onPress: () => setShowSelfieModal(true) },
                { text: 'Cancel', onPress: () => {
                    setPendingAttendance(null);
                    setScanned(false);
                    setMessage("Aim camera at the Teacher's QR Code");
                }},
            ]);
        } else {
            // Generic error — reset
            setPendingAttendance(null);
            setScanned(false);
            setMessage('Verification error. Try scanning again.');
        }
    };

    // ── Submit to server (called only after face passes) ──────────────────
    const submitAttendanceToServer = async () => {
        if (!pendingAttendance || !studentInfoRef.current) return;
        const { sessionCode, location, timestamp, signature } = pendingAttendance;
        const studentInfo = studentInfoRef.current;

        setMessage('⏳ Submitting Attendance...');

        const res = await fetch(`${DEFAULT_SERVER_URL}/api/student/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...APP_SECRET_HEADER,
                'x-signature': signature,
                'x-timestamp': timestamp,
            },
            body: JSON.stringify({
                email:       studentInfo.email,
                deviceId:    studentInfo.deviceId,
                sessionCode: sessionCode,
                lat:         location.coords.latitude,
                lon:         location.coords.longitude,
            }),
        });

        const responseText = await res.text();
        let resultData: any;
        try { resultData = JSON.parse(responseText); }
        catch { throw new Error('Crashed: ' + responseText); }

        if (resultData.success) {
            setMessage('✅ Attendance Recorded! Tracking in background…');
            setPendingAttendance(null);

            const sessionDurationMs = resultData.sessionDurationMs ?? 60 * 60 * 1000;

            await startBackgroundTracking({
                sessionCode,
                lat:        resultData.lat    ?? location.coords.latitude,
                lon:        resultData.lon    ?? location.coords.longitude,
                radius:     resultData.radius ?? 200,
                expiresAt:  Date.now() + sessionDurationMs,
                serverUrl:  DEFAULT_SERVER_URL,
                appSecret:  APP_SECRET_KEY,
                email:      studentInfo.email,
                deviceId:   studentInfo.deviceId,
            });
        } else {
            setPendingAttendance(null);
            Alert.alert('Attendance Failed', resultData.error || 'Unknown error occurred.', [
                { text: 'Try Again', onPress: () => setScanned(false) },
            ]);
            setMessage('Failed. Try scanning again.');
        }
    };

    // ── Gallery upload ─────────────────────────────────────────────────────
    const processImageWithServer = async (uri: string) => {
        try {
            setMessage('Uploading image for scanning...');
            const formData = new FormData();
            formData.append('qrimage', { uri, name: 'scan.jpg', type: 'image/jpeg' } as any);

            const res  = await fetch(`${DEFAULT_SERVER_URL}/api/student/decode-qr`, {
                method: 'POST',
                headers: APP_SECRET_HEADER,
                body: formData,
            });
            const data = await res.json();

            if (data.success && data.data) {
                await processQRData(data.data);
            } else {
                Alert.alert('No QR Found', data.error || 'Failed to detect a QR code in the image.');
                setScanned(false);
                setMessage('Ready to scan');
            }
        } catch {
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
            if (!result.canceled && result.assets?.length > 0) {
                setScanned(true);
                await processImageWithServer(result.assets[0].uri);
            }
        } catch {
            Alert.alert('Error', 'Failed to process gallery image.');
            setScanned(false);
            setMessage('Ready to scan');
        }
    };

    // ── Permission gates ───────────────────────────────────────────────────
    if (hasPermission === null) {
        return <View style={styles.container}><Text style={styles.text}>Requesting permissions...</Text></View>;
    }
    if (hasPermission === false) {
        return <View style={styles.container}><Text style={styles.text}>No access to camera or location. Please allow in settings.</Text></View>;
    }

    // ── Range badge ────────────────────────────────────────────────────────
    const rangeBadge = tracking && inRange !== null
        ? inRange
            ? <View style={[styles.rangeBadge, styles.rangeBadgeIn]}><Text style={styles.rangeBadgeText}>✅ In Range</Text></View>
            : <View style={[styles.rangeBadge, styles.rangeBadgeOut]}><Text style={styles.rangeBadgeText}>⚠️ Out of Range</Text></View>
        : null;

    return (
        <View style={styles.container}>
            {/* Hidden face verification WebView — only mounted when verifying */}
            {faceVerifying && faceSelfieb64 && refDescriptor && (
                <FaceVerifyWebView
                    mode="verify"
                    imageBase64={faceSelfieb64}
                    referenceDescriptor={refDescriptor}
                    onDescriptor={() => {}}
                    onResult={onFaceMatch}
                    onError={onFaceError}
                />
            )}

            {/* Selfie Prompt Modal */}
            <Modal visible={showSelfieModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalIcon}>🤳</Text>
                        <Text style={styles.modalTitle}>Quick Verification</Text>
                        <Text style={styles.modalDesc}>
                            QR scanned! Before we record attendance, we need a quick selfie to confirm it's you.
                        </Text>
                        <TouchableOpacity style={styles.selfieBtn} onPress={takeSelfieForVerification} activeOpacity={0.8}>
                            <Text style={styles.selfieBtnText}>📷  Take Selfie</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                            setShowSelfieModal(false);
                            setPendingAttendance(null);
                            setScanned(false);
                            setMessage("Aim camera at the Teacher's QR Code");
                        }}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Face verifying overlay */}
            {faceVerifying && (
                <View style={styles.verifyOverlay}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text style={styles.verifyText}>{faceStatusMsg || 'Verifying identity…'}</Text>
                    <Text style={styles.verifyNote}>Running on-device — no data sent to server</Text>
                </View>
            )}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Dashboard</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Scan Session QR</Text>
                <View style={{ width: 60 }} />
            </View>

            <View style={styles.cameraFrame}>
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                >
                    <View style={styles.overlay}>
                        <View style={styles.unfocusedContainer} />
                        <View style={styles.middleContainer}>
                            <View style={styles.unfocusedContainer} />
                            <View style={[styles.focusedContainer, tracking && styles.focusedContainerTracking]} />
                            <View style={styles.unfocusedContainer} />
                        </View>
                        <View style={styles.unfocusedContainer} />
                    </View>
                </CameraView>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>{studentInfo?.email}</Text>
                <Text style={[styles.statusText, scanned && { color: '#f59e0b' }, { marginBottom: 8 }]}>
                    {message}
                </Text>
                {rangeBadge}
                {tracking && (
                    <Text style={styles.trackingNote}>
                        📡 Background tracking active — safe to minimize
                    </Text>
                )}
                <TouchableOpacity
                    style={[styles.uploadBtn, { marginTop: 12 }]}
                    onPress={uploadFromGallery}
                    disabled={scanned && !tracking}
                >
                    <Text style={styles.uploadBtnText}>🖼️ Upload QR from Gallery</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container:                { flex: 1, backgroundColor: '#0f172a' },
    text:                     { color: 'white', alignSelf: 'center', marginTop: '50%' },
    header:                   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20 },
    headerTitle:              { fontSize: 20, fontWeight: 'bold', color: 'white' },
    backBtn:                  { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#1e293b', borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
    backText:                 { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
    cameraFrame:              { flex: 1, overflow: 'hidden' },
    overlay:                  { flex: 1, backgroundColor: 'transparent' },
    unfocusedContainer:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
    middleContainer:          { flexDirection: 'row', flex: 1.5 },
    focusedContainer:         { flex: 6, borderWidth: 2, borderColor: '#22c55e', backgroundColor: 'transparent' },
    focusedContainerTracking: { borderColor: '#6366f1' },
    footer:                   { padding: 24, backgroundColor: '#0f172a', alignItems: 'center' },
    footerText:               { color: '#94a3b8', fontSize: 13, marginBottom: 8, fontWeight: '500' },
    statusText:               { color: '#22c55e', fontSize: 15, fontWeight: 'bold', textAlign: 'center' },
    rangeBadge:               { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginBottom: 4 },
    rangeBadgeIn:             { backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 1, borderColor: '#22c55e' },
    rangeBadgeOut:            { backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: '#f59e0b' },
    rangeBadgeText:           { fontSize: 14, fontWeight: '700', color: '#f1f5f9' },
    trackingNote:             { fontSize: 12, color: '#6366f1', marginTop: 6, marginBottom: 4, fontWeight: '500' },
    uploadBtn:                { width: '100%', backgroundColor: '#1e293b', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
    uploadBtnText:            { color: '#f1f5f9', fontSize: 14, fontWeight: '700' },
    // Face verification modal
    modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 32 },
    modalCard:     { width: '100%', backgroundColor: '#1e293b', borderRadius: 24, padding: 28, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#334155' },
    modalIcon:     { fontSize: 52 },
    modalTitle:    { fontSize: 20, fontWeight: '800', color: '#f1f5f9', textAlign: 'center' },
    modalDesc:     { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 22 },
    selfieBtn:     { width: '100%', backgroundColor: '#6366f1', paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: 4 },
    selfieBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    cancelBtn:     { paddingVertical: 10 },
    cancelBtnText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
    // Face processing overlay
    verifyOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.95)', justifyContent: 'center', alignItems: 'center', gap: 16, zIndex: 100 },
    verifyText:    { fontSize: 18, fontWeight: '700', color: '#f1f5f9' },
    verifyNote:    { fontSize: 12, color: '#6366f1', fontWeight: '500' },
});

