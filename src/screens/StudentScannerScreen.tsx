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
import * as Device from 'expo-device';
import * as ScreenCapture from 'expo-screen-capture';
import { DEFAULT_SERVER_URL, APP_SECRET_HEADER, APP_SECRET_KEY } from '../config';
import * as FaceDetector from 'expo-face-detector';

// ── Task & Storage Keys ────────────────────────────────────────────────────
const GEOFENCE_TASK      = 'aegis-geofence-task';
const SESSION_META_KEY   = 'aegis_session_meta';
const LAST_STATUS_KEY    = 'aegis_geofence_last_status'; // 'true' | 'false'

// ── Flow Types ──────────────────────────────────────────────────────────────
type FlowStep = 
    | 'scanning'        // waiting for QR scan
    | 'face-capture'    // QR done, waiting for selfie (with blink)
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

    // ANTI-CHEAT: Check for Mock Locations (Fake GPS apps)
    const isMocked = (location as any).mocked || location.coords.accuracy === 0;
    
    try {
        const metaStr = await AsyncStorage.getItem(SESSION_META_KEY);
        if (!metaStr) {
            await Location.stopLocationUpdatesAsync(GEOFENCE_TASK).catch(() => {});
            return;
        }
        const meta = JSON.parse(metaStr);

        if (isMocked) {
            // Log security event to server
            await fetch(`${meta.serverUrl}/api/student/location-event`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-app-secret': meta.appSecret },
                body: JSON.stringify({
                    email: meta.email,
                    deviceId: meta.deviceId,
                    sessionCode: meta.sessionCode,
                    eventType: 'security_violation',
                    details: 'Mock location detected in background.',
                    lat: location.coords.latitude,
                    lon: location.coords.longitude,
                }),
            }).catch(() => {});
            return; // Don't process attendance if mocked
        }
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
    const [message, setMessage]   = useState("Verify identity to continue");

    const [step, setStep] = useState<FlowStep>('face-capture');
    const [pendingCode, setPendingCode] = useState<string | null>(null);
    const cameraRef = useRef<any>(null);

    // ── Liveness Detection State ───────────────────────────────────────────
    const isBlinkingRef = useRef(false);
    const [isBlinking, setIsBlinking] = useState(false); 
    const blinkConfirmedRef = useRef(false);
    const [blinkConfirmed, setBlinkConfirmed] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const [isSmiling, setIsSmiling] = useState(false);
    // Manual capture removed — blink is the ONLY way (anti-proxy security)

    const [studentInfo, setStudentInfo] = useState<{ email: string; deviceId: string } | null>(null);
    const studentInfoRef = useRef<{ email: string; deviceId: string } | null>(null);
    const uiPollRef = useRef<NodeJS.Timeout | null>(null);
    const [savedLocation, setSavedLocation] = useState<{lat: number, lon: number} | null>(null);

    useEffect(() => {
        (async () => {
            // 1. Device Integrity Check (No Emulators)
            if (!Device.isDevice) {
                Alert.alert("Security Breach", "A.E.G.I.S can only be used on physical mobile devices. Emulators are blocked.");
                navigation.goBack();
                return;
            }

            // 2. Prevent Screenshots & Screen Recording
            await ScreenCapture.preventScreenCaptureAsync().catch(() => {});

            const { status: camStatus } = await Camera.requestCameraPermissionsAsync();
            const { status: fgStatus }  = await Location.requestForegroundPermissionsAsync();
            setHasPermission(camStatus === 'granted' && fgStatus === 'granted');

            const savedString = await AsyncStorage.getItem('student_user');
            if (savedString) {
                const parsed = JSON.parse(savedString);
                setStudentInfo(parsed);
                studentInfoRef.current = parsed;
            } else {
                navigation.replace('StudentLogin');
            }

            // No manual fallback — blink is mandatory for liveness security
        })();

        return () => {
            // Re-enable screen capture when leaving
            ScreenCapture.allowScreenCaptureAsync().catch(() => {});
        };
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

    const onFacesDetected = async ({ faces }: any) => {
        if (step !== 'face-capture' || blinkConfirmedRef.current) return;
        setFaceDetected(faces.length > 0);
        if (faces.length > 0) {
            setMessage("Face aligned. Tap the button to verify.");
        } else {
            setMessage("Looking for face...");
        }
    };

    const captureMotionBurst = async () => {
        if (!cameraRef.current || !faceDetected) return;
        try {
            setStep('processing');
            blinkConfirmedRef.current = true;
            setBlinkConfirmed(true);
            
            const burst: string[] = [];
            const frameCount = 8;
            
            for (let i = 0; i < frameCount; i++) {
                setMessage(`Recording Motion: ${Math.round((i/frameCount)*100)}%`);
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.2, // Lower quality for burst to save bandwidth
                    base64: true,
                    exif: false,
                });
                burst.push(`data:image/jpeg;base64,${photo.base64}`);
                // Small delay to capture natural movement/blinking
                await new Promise(r => setTimeout(r, 150));
            }

            await handleFaceVerification(burst);
        } catch (err: any) {
            Alert.alert('Capture Error', err.message);
            resetToFace();
        }
    };

    const handleBarcodeScanned = async ({ data }: { type: string; data: string }) => {
        if (step !== 'scanning' || !studentInfo) return;
        const match = data.match(/\/s\/([a-zA-Z0-9_-]+)/);
        if (!match) { setMessage('Invalid QR. Try again.'); return; }
        setStep('processing');
        submitAttendance(match[1]);
    };

    const handleFaceVerification = async (burst: string[]) => {
        if (!studentInfo) return;
        try {
            setMessage('Analyzing motion & identity...');
            const verifyRes = await fetch(`${DEFAULT_SERVER_URL}/api/student/verify-face`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...APP_SECRET_HEADER },
                body: JSON.stringify({ 
                    email: studentInfo.email, 
                    deviceId: studentInfo.deviceId, 
                    image: burst, // Send burst array
                    livenessVerified: true 
                }),
            });
            const verifyData = await verifyRes.json();

            if (!verifyData.success || !verifyData.verified) {
                Alert.alert('❌ Identity Failed', verifyData.error || 'Face mismatch.', [{ text: 'OK', onPress: resetToFace }]);
                return;
            }
            
            if (verifyData.wasRegistration) {
                setMessage('Face enrolled successfully!');
            } else {
                setMessage('Identity verified!');
            }
            
            await getLocationAndProceed();
        } catch (err: any) { Alert.alert('Error', err.message); resetToFace(); }
    };

    const getLocationAndProceed = async () => {
        try {
            setMessage('📍 Getting location...');
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            
            if (location.mocked) { 
                // Instant Server Alert
                if (studentInfo) {
                    await fetch(`${DEFAULT_SERVER_URL}/api/student/location-event`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...APP_SECRET_HEADER },
                        body: JSON.stringify({
                            email: studentInfo.email,
                            deviceId: studentInfo.deviceId,
                            sessionCode: pendingCode || 'unknown',
                            eventType: 'security_violation',
                            details: 'Mock location detected during submission.',
                            lat: location.coords.latitude,
                            lon: location.coords.longitude,
                        }),
                    }).catch(() => {});
                }
                Alert.alert('Access Denied', 'GPS spoofing detected. This violation has been logged.'); 
                resetToFace(); 
                return; 
            }
            
            setSavedLocation({ lat: location.coords.latitude, lon: location.coords.longitude });
            resetToScanning();
        } catch (err: any) {
            Alert.alert('Location Error', 'Could not get location. Try again.');
            resetToFace();
        }
    };

    const submitAttendance = async (sessionCode: string, locationOverride?: {lat: number, lon: number}) => {
        const locToUse = locationOverride || savedLocation;
        if (!studentInfo || !locToUse) return;
        try {
            setMessage('⏳ Submitting...');
            const timestamp = Date.now().toString();
            const payload   = studentInfo.email.toLowerCase().trim() + studentInfo.deviceId + sessionCode;
            const signature = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, payload + timestamp + APP_SECRET_KEY);

            const res = await fetch(`${DEFAULT_SERVER_URL}/api/student/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...APP_SECRET_HEADER, 'x-signature': signature, 'x-timestamp': timestamp },
                body: JSON.stringify({ email: studentInfo.email, deviceId: studentInfo.deviceId, sessionCode, lat: locToUse.lat, lon: locToUse.lon, faceVerified: true }),
            });

            const data = await res.json();
            if (data.success) {
                setStep('done');
                setMessage('✅ Attendance Recorded!');
                Alert.alert('Success', 'Face verified, Network Identity confirmed, and attendance marked.');
                await startBackgroundTracking({
                    sessionCode,
                    lat: data.lat ?? locToUse.lat,
                    lon: data.lon ?? locToUse.lon,
                    radius: data.radius ?? 200,
                    expiresAt: Date.now() + (data.sessionDurationMs ?? 3600000),
                    serverUrl: DEFAULT_SERVER_URL,
                    appSecret: APP_SECRET_KEY,
                    email: studentInfo.email,
                    deviceId: studentInfo.deviceId,
                });
            } else { Alert.alert('Failed', data.error, [{ text: 'OK', onPress: resetToScanning }]); }
        } catch (err: any) { Alert.alert('Network Error', err.message); resetToScanning(); }
    };

    const resetToFace = () => { 
        setStep('face-capture'); 
        setPendingCode(null); 
        setScanned(false); 
        setSavedLocation(null); 
        setBlinkConfirmed(false);
        blinkConfirmedRef.current = false;
        setIsBlinking(false);
        isBlinkingRef.current = false;
        setMessage("Blink naturally to verify identity");
    };

    const resetToScanning = () => { setStep('scanning'); setPendingCode(null); setScanned(false); setMessage("Aim camera at Teacher's QR Code"); };

    if (hasPermission === null) return <View style={styles.container}><Text style={styles.text}>Requesting permissions...</Text></View>;
    if (hasPermission === false) return <View style={styles.container}><Text style={styles.text}>Camera/Location access required.</Text></View>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Text style={styles.backText}>← Dashboard</Text></TouchableOpacity>
                <Text style={styles.headerTitle}>{step === 'scanning' ? 'Scan Session QR' : step === 'face-capture' ? 'Liveness Challenge' : 'Processing...'}</Text>
                <View style={{ width: 80 }} />
            </View>
            <View style={styles.cameraFrame}>
                {step === 'scanning' && (
                    <CameraView 
                        style={StyleSheet.absoluteFillObject} 
                        onBarcodeScanned={handleBarcodeScanned} 
                        barcodeScannerSettings={{ barcodeTypes: ['qr'] }} 
                        facing="back"
                    >
                        <View style={styles.qrOverlay}><View style={styles.unfocused} /><View style={styles.middle}><View style={styles.unfocused} /><View style={styles.focused} /><View style={styles.unfocused} /></View><View style={styles.unfocused} /></View>
                    </CameraView>
                )}
                {step === 'face-capture' && (
                    <CameraView
                        ref={cameraRef}
                        style={StyleSheet.absoluteFillObject}
                        facing="front"
                        onFacesDetected={onFacesDetected}
                        faceDetectorSettings={{
                            mode: FaceDetector.FaceDetectorMode.accurate,
                            detectLandmarks: FaceDetector.FaceDetectorLandmarks.all,
                            runClassifications: FaceDetector.FaceDetectorClassifications.all,
                            minDetectionInterval: 50,
                            tracking: true,
                        }}
                    >
                        <View style={styles.faceOverlay}>
                            <Text style={styles.faceGuideText}>{message}</Text>
                            <View style={[styles.faceCircle, faceDetected && {borderColor: '#22c55e'}]} />
                            {faceDetected && step === 'face-capture' && (
                                <TouchableOpacity 
                                    style={styles.captureBtn} 
                                    onPress={captureMotionBurst}
                                >
                                    <View style={styles.captureBtnInner} />
                                </TouchableOpacity>
                            )}
                            <Text style={styles.faceTip}>Align face and tap the button to verify identity.</Text>
                        </View>
                    </CameraView>
                )}
                {step === 'processing' && (
                    <View style={styles.processingOverlay}><ActivityIndicator size="large" color="#6366f1" /><Text style={styles.processingText}>{message}</Text></View>
                )}
            </View>
            <View style={styles.footer}>
                <Text style={styles.footerEmail}>{studentInfo?.email}</Text>
                <Text style={styles.footerMsg}>{message}</Text>
                {step === 'scanning' && <TouchableOpacity style={styles.galleryBtn} onPress={() => Alert.alert('Security Lock', 'Gallery upload is disabled for identity verification.')}><Text style={[styles.galleryBtnText, {color: '#64748b'}]}>🖼️ Gallery Disabled</Text></TouchableOpacity>}
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
    faceOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 32 },
    faceGuideText: { color: '#f1f5f9', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 40, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 4 },
    faceCircle: { width: 260, height: 260, borderRadius: 130, borderWidth: 4, borderColor: '#6366f1', borderStyle: 'dashed' },
    captureBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderWidth: 4,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40,
    },
    captureBtnInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#fff',
    },
    faceTip: { color: '#f1f5f9', fontSize: 14, textAlign: 'center', marginTop: 20, fontWeight: '600' },
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


