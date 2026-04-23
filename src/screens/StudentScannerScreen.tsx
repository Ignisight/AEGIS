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

// ── Task & Storage Keys ────────────────────────────────────────────────────
const GEOFENCE_TASK      = 'aegis-geofence-task';
const SESSION_META_KEY   = 'aegis_session_meta';
const LAST_STATUS_KEY    = 'aegis_geofence_last_status'; // 'true' | 'false'

// ── Flow Types ──────────────────────────────────────────────────────────────
type FlowStep = 
    | 'scanning'        // waiting for QR scan
    | 'face-capture'    // QR done, waiting for selfie
    | 'processing'      // sending to server
    | 'done';           // complete

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
// BACKGROUND TASK
// ═══════════════════════════════════════════════════════════════════════════
TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }: any) => {
    if (error) return;
    const locations: Location.LocationObject[] = data?.locations ?? [];
    const location = locations[0];
    if (!location) return;

    try {
        const metaStr = await AsyncStorage.getItem(SESSION_META_KEY);
        if (!metaStr) {
            await Location.stopLocationUpdatesAsync(GEOFENCE_TASK).catch(() => {});
            return;
        }
        const meta = JSON.parse(metaStr);
        if (Date.now() >= meta.expiresAt) {
            await Location.stopLocationUpdatesAsync(GEOFENCE_TASK).catch(() => {});
            await AsyncStorage.multiRemove([SESSION_META_KEY, LAST_STATUS_KEY]);
            return;
        }

        const dist = haversineDistance(location.coords.latitude, location.coords.longitude, meta.lat, meta.lon);
        const currentlyInside = dist <= meta.radius;
        const lastStatusStr  = await AsyncStorage.getItem(LAST_STATUS_KEY);
        const lastStatus     = lastStatusStr !== null ? lastStatusStr === 'true' : null;
        const statusFlipped  = lastStatus !== null && lastStatus !== currentlyInside;

        await AsyncStorage.setItem(LAST_STATUS_KEY, String(currentlyInside));

        if (statusFlipped) {
            const eventType = currentlyInside ? 'entry' : 'exit';
            await fetch(`${meta.serverUrl}/api/student/location-event`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-app-secret': meta.appSecret },
                body: JSON.stringify({
                    email: meta.email,
                    deviceId: meta.deviceId,
                    sessionCode: meta.sessionCode,
                    eventType,
                    lat: location.coords.latitude,
                    lon: location.coords.longitude,
                }),
            });
        }
    } catch (err) { /* silent */ }
});

export default function StudentScannerScreen({ navigation }: any) {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    const [tracking, setTracking] = useState(false);
    const [inRange, setInRange]   = useState<boolean | null>(null);
    const [message, setMessage]   = useState("Aim camera at Teacher's QR Code");

    const [step, setStep] = useState<FlowStep>('scanning');
    const [pendingCode, setPendingCode] = useState<string | null>(null);
    const cameraRef = useRef<any>(null);

    const [studentInfo, setStudentInfo] = useState<{ email: string; deviceId: string } | null>(null);
    const studentInfoRef = useRef<{ email: string; deviceId: string } | null>(null);
    const uiPollRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        (async () => {
            const { status: camStatus } = await Camera.requestCameraPermissionsAsync();
            const { status: fgStatus }  = await Location.requestForegroundPermissionsAsync();
            let bgGranted = false;
            try {
                const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
                bgGranted = bgStatus === 'granted';
            } catch { /* ignore */ }

            setHasPermission(camStatus === 'granted' && fgStatus === 'granted');

            const savedString = await AsyncStorage.getItem('student_user');
            if (savedString) {
                const parsed = JSON.parse(savedString);
                setStudentInfo(parsed);
                studentInfoRef.current = parsed;
            } else {
                navigation.replace('StudentLogin');
            }
        })();
    }, []);

    useEffect(() => {
        return () => { if (uiPollRef.current) clearInterval(uiPollRef.current); };
    }, []);

    const startBackgroundTracking = async (meta: any) => {
        await AsyncStorage.setItem(SESSION_META_KEY, JSON.stringify(meta));
        await AsyncStorage.setItem(LAST_STATUS_KEY, 'true');
        setTracking(true);
        setInRange(true);

        const isRunning = await Location.hasStartedLocationUpdatesAsync(GEOFENCE_TASK).catch(() => false);
        if (isRunning) await Location.stopLocationUpdatesAsync(GEOFENCE_TASK).catch(() => {});

        await Location.startLocationUpdatesAsync(GEOFENCE_TASK, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 60000,
            distanceInterval: 0,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
                notificationTitle: 'A.E.G.I.S — Attendance Active',
                notificationBody:  'Verifying your classroom location. Do not close.',
                notificationColor: '#6366f1',
            },
        });

        uiPollRef.current = setInterval(async () => {
            const metaStr = await AsyncStorage.getItem(SESSION_META_KEY).catch(() => null);
            if (!metaStr) { clearInterval(uiPollRef.current!); setTracking(false); return; }
            const m = JSON.parse(metaStr);
            if (Date.now() >= m.expiresAt) {
                clearInterval(uiPollRef.current!);
                setTracking(false);
                await Location.stopLocationUpdatesAsync(GEOFENCE_TASK).catch(() => {});
                await AsyncStorage.multiRemove([SESSION_META_KEY, LAST_STATUS_KEY]);
                return;
            }
            const statusStr = await AsyncStorage.getItem(LAST_STATUS_KEY).catch(() => null);
            if (statusStr !== null) setInRange(statusStr === 'true');
        }, 5000);
    };

    const handleBarcodeScanned = async ({ data }: { type: string; data: string }) => {
        if (step !== 'scanning' || !studentInfo) return;
        const match = data.match(/\/s\/([a-zA-Z0-9_-]+)/);
        if (!match) { setMessage('Invalid QR. Try again.'); return; }
        setPendingCode(match[1]);
        setStep('face-capture');
        setMessage('QR verified! Now take a selfie to confirm identity.');
    };

    const handleCaptureSelfie = async () => {
        if (!cameraRef.current || !pendingCode || !studentInfo) return;
        setStep('processing');
        setMessage('Capturing...');
        try {
            const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true, exif: false, width: 640 });
            await handleFaceVerification(`data:image/jpeg;base64,${photo.base64}`);
        } catch (err: any) { Alert.alert('Camera Error', err.message); reset(); }
    };

    const handleFaceVerification = async (b64Image: string) => {
        if (!studentInfo || !pendingCode) return;
        try {
            setMessage('Verifying identity...');
            const verifyRes = await fetch(`${DEFAULT_SERVER_URL}/api/student/verify-face`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...APP_SECRET_HEADER },
                body: JSON.stringify({ email: studentInfo.email, deviceId: studentInfo.deviceId, image: b64Image }),
            });
            const verifyData = await verifyRes.json();

            if (verifyData.needsRegistration) {
                setMessage('First time setup — registering face...');
                const regRes = await fetch(`${DEFAULT_SERVER_URL}/api/student/register-face`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...APP_SECRET_HEADER },
                    body: JSON.stringify({ email: studentInfo.email, deviceId: studentInfo.deviceId, image: b64Image }),
                });
                const regData = await regRes.json();
                if (!regData.success) { Alert.alert('Registration Failed', regData.error, [{ text: 'OK', onPress: reset }]); return; }
                await submitAttendance(pendingCode);
                return;
            }

            if (!verifyData.success || !verifyData.verified) {
                Alert.alert('❌ Identity Failed', verifyData.error || 'Face mismatch.', [{ text: 'OK', onPress: reset }]);
                return;
            }
            await submitAttendance(pendingCode);
        } catch (err: any) { Alert.alert('Error', err.message); reset(); }
    };

    const submitAttendance = async (sessionCode: string) => {
        if (!studentInfo) return;
        try {
            setMessage('📍 Getting location...');
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            if (location.mocked) { Alert.alert('Access Denied', 'GPS spoofing detected.'); reset(); return; }

            setMessage('⏳ Submitting...');
            const timestamp = Date.now().toString();
            const payload   = studentInfo.email.toLowerCase().trim() + studentInfo.deviceId + sessionCode;
            const signature = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, payload + timestamp + APP_SECRET_KEY);

            const res = await fetch(`${DEFAULT_SERVER_URL}/api/student/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...APP_SECRET_HEADER, 'x-signature': signature, 'x-timestamp': timestamp },
                body: JSON.stringify({ email: studentInfo.email, deviceId: studentInfo.deviceId, sessionCode, lat: location.coords.latitude, lon: location.coords.longitude, faceVerified: true }),
            });

            const data = await res.json();
            if (data.success) {
                setStep('done');
                setMessage('✅ Attendance Recorded!');
                Alert.alert('Success', 'Face verified and attendance marked.');
                await startBackgroundTracking({
                    sessionCode,
                    lat: data.lat ?? location.coords.latitude,
                    lon: data.lon ?? location.coords.longitude,
                    radius: data.radius ?? 200,
                    expiresAt: Date.now() + (data.sessionDurationMs ?? 3600000),
                    serverUrl: DEFAULT_SERVER_URL,
                    appSecret: APP_SECRET_KEY,
                    email: studentInfo.email,
                    deviceId: studentInfo.deviceId,
                });
            } else { Alert.alert('Failed', data.error, [{ text: 'OK', onPress: reset }]); }
        } catch (err: any) { Alert.alert('Network Error', err.message); reset(); }
    };

    const reset = () => { setStep('scanning'); setPendingCode(null); setScanned(false); setMessage("Aim camera at Teacher's QR Code"); };

    const uploadFromGallery = async () => {
        if (step !== 'scanning' || !studentInfo) return;
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
        if (!result.canceled && result.assets?.length > 0) { setStep('processing'); await processGalleryImage(result.assets[0].uri); }
    };

    const processGalleryImage = async (uri: string) => {
        try {
            setMessage('Decoding QR...');
            const formData = new FormData();
            formData.append('qrimage', { uri, name: 'scan.jpg', type: 'image/jpeg' } as any);
            const res = await fetch(`${DEFAULT_SERVER_URL}/api/student/decode-qr`, { method: 'POST', headers: APP_SECRET_HEADER, body: formData });
            const data = await res.json();
            if (data.success && data.data) {
                const match = data.data.match(/\/s\/([a-zA-Z0-9_-]+)/);
                if (match) { setPendingCode(match[1]); setStep('face-capture'); setMessage('QR verified! Now take a selfie.'); }
                else { Alert.alert('Invalid QR', 'Not an attendance QR.'); reset(); }
            } else { Alert.alert('No QR Found', data.error); reset(); }
        } catch { Alert.alert('Error', 'Server unreachable.'); reset(); }
    };

    if (hasPermission === null) return <View style={styles.container}><Text style={styles.text}>Requesting permissions...</Text></View>;
    if (hasPermission === false) return <View style={styles.container}><Text style={styles.text}>Camera/Location access required.</Text></View>;

    const rangeBadge = tracking && inRange !== null
        ? inRange
            ? <View style={[styles.rangeBadge, styles.rangeBadgeIn]}><Text style={styles.rangeBadgeText}>✅ In Range</Text></View>
            : <View style={[styles.rangeBadge, styles.rangeBadgeOut]}><Text style={styles.rangeBadgeText}>⚠️ Out of Range</Text></View>
        : null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Text style={styles.backText}>← Dashboard</Text></TouchableOpacity>
                <Text style={styles.headerTitle}>{step === 'scanning' ? 'Scan Session QR' : step === 'face-capture' ? 'Verify Identity' : 'Processing...'}</Text>
                <View style={{ width: 80 }} />
            </View>
            <View style={styles.cameraFrame}>
                <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} onBarcodeScanned={step === 'scanning' ? handleBarcodeScanned : undefined} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} facing={step === 'face-capture' ? 'front' : 'back'}>
                    {step === 'scanning' && <View style={styles.qrOverlay}><View style={styles.unfocused} /><View style={styles.middle}><View style={styles.unfocused} /><View style={styles.focused} /><View style={styles.unfocused} /></View><View style={styles.unfocused} /></View>}
                    {step === 'face-capture' && <View style={styles.faceOverlay}><Text style={styles.faceGuideText}>Position your face in the circle</Text><View style={styles.faceCircle} /><Text style={styles.faceTip}>Good lighting · Only your face · Look straight ahead</Text><TouchableOpacity style={styles.captureBtn} onPress={handleCaptureSelfie}><Text style={styles.captureBtnText}>📸 Verify Identity</Text></TouchableOpacity><TouchableOpacity style={styles.cancelBtn} onPress={reset}><Text style={styles.cancelBtnText}>✕ Cancel</Text></TouchableOpacity></View>}
                    {step === 'processing' && <View style={styles.processingOverlay}><ActivityIndicator size="large" color="#6366f1" /><Text style={styles.processingText}>{message}</Text></View>}
                </CameraView>
            </View>
            <View style={styles.footer}>
                <Text style={styles.footerEmail}>{studentInfo?.email}</Text>
                <Text style={styles.footerMsg}>{message}</Text>
                {rangeBadge}
                {step === 'scanning' && <TouchableOpacity style={styles.galleryBtn} onPress={uploadFromGallery}><Text style={styles.galleryBtnText}>🖼️ Upload QR from Gallery</Text></TouchableOpacity>}
                {tracking && <Text style={styles.trackingNote}>📡 Background tracking active — safe to minimize</Text>}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    text: { color: 'white', textAlign: 'center', marginTop: '50%', padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#f1f5f9' },
    backBtn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#1e293b', borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
    backText: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
    cameraFrame: { flex: 1, overflow: 'hidden' },
    qrOverlay: { flex: 1 },
    unfocused: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
    middle: { flexDirection: 'row', flex: 1.5 },
    focused: { flex: 6, borderWidth: 2, borderColor: '#22c55e' },
    faceOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 32, gap: 20 },
    faceGuideText: { color: '#f1f5f9', fontSize: 16, fontWeight: '600', textAlign: 'center' },
    faceCircle: { width: 220, height: 220, borderRadius: 110, borderWidth: 3, borderColor: '#6366f1', borderStyle: 'dashed' },
    faceTip: { color: '#94a3b8', fontSize: 12, textAlign: 'center', lineHeight: 18 },
    captureBtn: { backgroundColor: '#6366f1', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 14, width: '100%', alignItems: 'center' },
    captureBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    cancelBtn: { paddingVertical: 8 },
    cancelBtnText: { color: '#94a3b8', fontSize: 14 },
    processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', gap: 20 },
    processingText: { color: '#f1f5f9', fontSize: 16, fontWeight: '600', textAlign: 'center', paddingHorizontal: 32 },
    footer: { padding: 24, backgroundColor: '#0f172a', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: '#1e293b' },
    footerEmail: { color: '#64748b', fontSize: 12, fontWeight: '500' },
    footerMsg: { color: '#22c55e', fontSize: 14, fontWeight: '600', textAlign: 'center' },
    galleryBtn: { marginTop: 8, width: '100%', backgroundColor: '#1e293b', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
    galleryBtnText: { color: '#f1f5f9', fontSize: 14, fontWeight: '600' },
    rangeBadge: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginBottom: 4 },
    rangeBadgeIn: { backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 1, borderColor: '#22c55e' },
    rangeBadgeOut: { backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: '#f59e0b' },
    rangeBadgeText: { fontSize: 14, fontWeight: '700', color: '#f1f5f9' },
    trackingNote: { fontSize: 11, color: '#6366f1', marginTop: 4, fontWeight: '600' },
});


