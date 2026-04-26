import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    ScrollView,
    Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FACE_DESCRIPTOR_KEY } from '../config';
import { registerFace } from '../api';

const { width } = Dimensions.get('window');

type Stage = 'intro' | 'capture' | 'processing' | 'done' | 'error';

export default function FaceSetupScreen({ navigation }: any) {
    const [permission, requestPermission] = useCameraPermissions();
    const [stage, setStage] = useState<Stage>('intro');
    const [errorMsg, setErrorMsg] = useState('');
    const [blinkCount, setBlinkCount] = useState(0);
    const [eyesClosed, setEyesClosed] = useState(false);
    const [showFallback, setShowFallback] = useState(false);
    const fallbackTimer = useRef<NodeJS.Timeout | null>(null);
    
    const cameraRef = useRef<any>(null);
    const isCapturing = useRef(false);

    // ── BLINK DETECTION ──────────────────────────────────────────────────
    const onFacesDetected = ({ faces }: any) => {
        if (stage !== 'capture' || isCapturing.current) return;
        if (faces.length === 0) return;

        const face = faces[0];
        const leftOpen  = face.leftEyeOpenProbability;
        const rightOpen = face.rightEyeOpenProbability;

        // Detect blink (eyes go from open -> closed -> open)
        // Softened thresholds for better reliability (0.2 -> 0.3, 0.7 -> 0.6)
        if (!eyesClosed && leftOpen < 0.3 && rightOpen < 0.3) {
            setEyesClosed(true);
        } else if (eyesClosed && leftOpen > 0.6 && rightOpen > 0.6) {
            setEyesClosed(false);
            setBlinkCount(prev => prev + 1);
            if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
            
            // Require 1 clear blink to capture
            autoCapture();
        }
    };

    const autoCapture = async () => {
        if (isCapturing.current) return;
        isCapturing.current = true;
        setStage('processing');

        try {
            if (!cameraRef.current) throw new Error("Camera not ready");

            const photo = await cameraRef.current.takePictureAsync({ 
                quality: 0.7, 
                base64: true,
                skipProcessing: false 
            });

            const userJson = await AsyncStorage.getItem('student_user');
            const deviceId = await AsyncStorage.getItem('deviceId');
            if (!userJson || !deviceId) throw new Error("Session expired. Log in again.");

            const { email } = JSON.parse(userJson);

            // Send to server for Anti-Spoofing + Registration
            const res = await registerFace(email, deviceId, photo.base64);

            if (res.success) {
                setStage('done');
            } else {
                throw new Error(res.error || "Setup failed");
            }
        } catch (err: any) {
            setErrorMsg(err.message || "Could not register face.");
            setStage('error');
        } finally {
            isCapturing.current = false;
        }
    };

    const startSetup = async () => {
        if (!permission?.granted) {
            const res = await requestPermission();
            if (!res.granted) {
                Alert.alert("Permission Denied", "Camera access is required for Face ID setup.");
                return;
            }
        }
        setStage('capture');
        setBlinkCount(0);
        setShowFallback(false);

        // If blink not detected in 8s, show manual button
        if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
        fallbackTimer.current = setTimeout(() => {
            setShowFallback(true);
        }, 8000);
    };

    const retry = () => {
        setStage('intro');
        setErrorMsg('');
        isCapturing.current = false;
    };

    const proceed = () => navigation.replace('StudentDashboard');

    if (!permission) return <View style={styles.container}><ActivityIndicator /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Face ID Enrollment</Text>
                <Text style={styles.subtitle}>Secure Biometric Whitelisting</Text>
            </View>

            {/* ── STAGE: INTRO ── */}
            {stage === 'intro' && (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.infoCard}>
                        <Text style={styles.infoTitle}>Zero-Trust Enrollment</Text>
                        <Text style={styles.infoText}>
                            To prevent proxy attendance, we must verify your live identity. 
                            This is a one-time process.
                        </Text>
                        
                        <View style={styles.featureRow}>
                            <Text style={styles.featureIcon}>👁️</Text>
                            <View>
                                <Text style={styles.featureTitle}>Blink Challenge</Text>
                                <Text style={styles.featureSub}>Prevents photo-based spoofing</Text>
                            </View>
                        </View>

                        <View style={styles.featureRow}>
                            <Text style={styles.featureIcon}>🛡️</Text>
                            <View>
                                <Text style={styles.featureTitle}>ArcFace 6.0</Text>
                                <Text style={styles.featureSub}>Military-grade facial encoding</Text>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.startBtn} onPress={startSetup}>
                        <Text style={styles.startBtnText}>Start Enrollment</Text>
                    </TouchableOpacity>
                </ScrollView>
            )}

            {/* ── STAGE: CAPTURE ── */}
            {stage === 'capture' && (
                <View style={styles.cameraBox}>
                    <CameraView
                        ref={cameraRef}
                        style={styles.camera}
                        facing="front"
                        onFacesDetected={onFacesDetected}
                        faceDetectorSettings={{
                            mode: FaceDetector.FaceDetectorMode.fast,
                            detectLandmarks: FaceDetector.FaceDetectorLandmarks.all,
                            runClassifications: FaceDetector.FaceDetectorClassifications.all,
                            minDetectionInterval: 50,
                            tracking: true,
                        }}
                    >
                        <View style={styles.overlay}>
                            <View style={styles.guideFrame} />
                            <View style={styles.instructionBox}>
                                <Text style={styles.instructionText}>
                                    {blinkCount === 0 ? "Please BLINK naturally" : "Capturing..."}
                                </Text>
                                <Text style={styles.subInstruction}>
                                    Keep face within the frame
                                </Text>
                                {showFallback && (
                                    <TouchableOpacity 
                                        style={styles.fallbackBtn} 
                                        onPress={() => {
                                            if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
                                            autoCapture();
                                        }}
                                    >
                                        <Text style={styles.fallbackBtnText}>Capture Manually</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </CameraView>
                </View>
            )}

            {/* ── STAGE: PROCESSING ── */}
            {stage === 'processing' && (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text style={styles.processingText}>Verifying Liveness...</Text>
                    <Text style={styles.processingSub}>Analysing Moire & Laplacian Variance</Text>
                </View>
            )}

            {/* ── STAGE: DONE ── */}
            {stage === 'done' && (
                <View style={styles.centerBox}>
                    <View style={styles.successCircle}>
                        <Text style={styles.successIcon}>✓</Text>
                    </View>
                    <Text style={styles.doneTitle}>Enrolled Successfully</Text>
                    <Text style={styles.doneSub}>Your biometric fingerprint is now active.</Text>
                    <TouchableOpacity style={styles.proceedBtn} onPress={proceed}>
                        <Text style={styles.proceedBtnText}>Enter Dashboard</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* ── STAGE: ERROR ── */}
            {stage === 'error' && (
                <View style={styles.centerBox}>
                    <Text style={styles.errorIcon}>⚠️</Text>
                    <Text style={styles.errorTitle}>Verification Failed</Text>
                    <Text style={styles.errorText}>{errorMsg}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={retry}>
                        <Text style={styles.retryBtnText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617', paddingHorizontal: 24 },
    header: { marginTop: 60, marginBottom: 30, alignItems: 'center' },
    title: { fontSize: 28, fontWeight: '900', color: '#f8fafc', letterSpacing: -1 },
    subtitle: { fontSize: 14, color: '#6366f1', fontWeight: '700', textTransform: 'uppercase', marginTop: 4 },
    scrollContent: { paddingBottom: 40 },
    infoCard: { backgroundColor: '#0f172a', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#1e293b' },
    infoTitle: { fontSize: 20, fontWeight: '800', color: '#f1f5f9', marginBottom: 12 },
    infoText: { fontSize: 15, color: '#94a3b8', lineHeight: 24, marginBottom: 24 },
    featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 16 },
    featureIcon: { fontSize: 24, backgroundColor: '#1e1b4b', padding: 10, borderRadius: 12 },
    featureTitle: { fontSize: 16, fontWeight: '700', color: '#e2e8f0' },
    featureSub: { fontSize: 13, color: '#64748b' },
    startBtn: { backgroundColor: '#6366f1', paddingVertical: 18, borderRadius: 16, marginTop: 30, alignItems: 'center' },
    startBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
    cameraBox: { flex: 1, borderRadius: 30, overflow: 'hidden', marginBottom: 40, borderWidth: 2, borderColor: '#334155' },
    camera: { flex: 1 },
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(2, 6, 23, 0.4)' },
    guideFrame: { width: width * 0.7, height: width * 0.7, borderRadius: width * 0.35, borderWidth: 4, borderColor: '#6366f1', borderStyle: 'dashed' },
    instructionBox: { position: 'absolute', bottom: 40, backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: 20, borderRadius: 20, alignItems: 'center', width: '80%', borderWidth: 1, borderColor: '#334155' },
    instructionText: { color: '#fff', fontSize: 18, fontWeight: '800' },
    subInstruction: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
    processingText: { fontSize: 22, fontWeight: '800', color: '#f1f5f9', marginTop: 24 },
    processingSub: { fontSize: 14, color: '#6366f1', marginTop: 8 },
    successCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
    successIcon: { fontSize: 40, color: '#fff' },
    doneTitle: { fontSize: 24, fontWeight: '800', color: '#f1f5f9' },
    doneSub: { fontSize: 15, color: '#94a3b8', marginTop: 8, textAlign: 'center' },
    proceedBtn: { backgroundColor: '#22c55e', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 16, marginTop: 32 },
    proceedBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    errorIcon: { fontSize: 60, marginBottom: 20 },
    errorTitle: { fontSize: 22, fontWeight: '800', color: '#ef4444' },
    errorText: { fontSize: 15, color: '#94a3b8', textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
    retryBtn: { backgroundColor: '#1e293b', paddingHorizontal: 30, paddingVertical: 14, borderRadius: 14, marginTop: 30 },
    retryBtnText: { color: '#f1f5f9', fontWeight: '700' },
    fallbackBtn: { backgroundColor: '#1e293b', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 15, borderWidth: 1, borderColor: '#334155' },
    fallbackBtnText: { color: '#6366f1', fontSize: 13, fontWeight: '700' },
});

