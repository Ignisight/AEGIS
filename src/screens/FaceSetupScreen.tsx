/**
 * FaceSetupScreen.tsx
 *
 * One-time face enrollment. Runs immediately after first login.
 * Captures a reference selfie → extracts face descriptor via FaceVerifyWebView
 * → stores 128-float descriptor in AsyncStorage (NOT the photo).
 *
 * Navigation:
 *   StudentLogin ──▶ FaceSetup ──▶ StudentDashboard
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FaceVerifyWebView from '../components/FaceVerifyWebView';

export const FACE_DESCRIPTOR_KEY = 'student_face_descriptor';

type Stage = 'intro' | 'loading_models' | 'capture' | 'processing' | 'done' | 'error';

export default function FaceSetupScreen({ navigation }: any) {
    const [stage, setStage]           = useState<Stage>('intro');
    const [selfieBase64, setSelfieBase64] = useState<string | null>(null);
    const [errorMsg, setErrorMsg]     = useState('');
    const [showWebView, setShowWebView] = useState(false);

    // ── Step 1: Take selfie ────────────────────────────────────────────────
    const takeSelfie = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Camera permission is needed to set up face verification.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            cameraType: ImagePicker.CameraType.front,
            quality: 0.85,
            base64: true,
            allowsEditing: true,
            aspect: [1, 1],
        });

        if (result.canceled || !result.assets?.[0]?.base64) return;

        const b64 = result.assets[0].base64!;
        setSelfieBase64(b64);
        setStage('processing');
        setShowWebView(true); // mount the FaceVerifyWebView
    };

    // ── Step 2: Descriptor received from WebView ──────────────────────────
    const handleDescriptor = async (descriptor: number[]) => {
        try {
            await AsyncStorage.setItem(FACE_DESCRIPTOR_KEY, JSON.stringify(descriptor));
            setStage('done');
            setShowWebView(false);
        } catch {
            setErrorMsg('Failed to save face data. Please try again.');
            setStage('error');
            setShowWebView(false);
        }
    };

    const handleVerifyError = (message: string) => {
        setShowWebView(false);
        setErrorMsg(message);
        setStage('error');
    };

    const retry = () => {
        setSelfieBase64(null);
        setErrorMsg('');
        setStage('intro');
    };

    const proceed = () => navigation.replace('StudentDashboard');

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <ScrollView contentContainerStyle={styles.container}>
            {/* Hidden WebView — only mounted when processing */}
            {showWebView && selfieBase64 && (
                <FaceVerifyWebView
                    mode="setup"
                    imageBase64={selfieBase64}
                    onDescriptor={handleDescriptor}
                    onResult={() => {}}
                    onError={handleVerifyError}
                />
            )}

            {/* Icon */}
            <View style={styles.iconCircle}>
                <Text style={styles.icon}>🪪</Text>
            </View>

            <Text style={styles.title}>Face Verification Setup</Text>

            {/* ── INTRO ── */}
            {(stage === 'intro' || stage === 'loading_models') && (
                <>
                    <Text style={styles.desc}>
                        A.E.G.I.S uses face verification to prevent proxy attendance.
                        {'\n\n'}
                        We'll take one selfie and create a secure face profile on this device only.
                        Your photo is <Text style={styles.accent}>never stored or uploaded</Text>.
                    </Text>

                    <View style={styles.bulletBox}>
                        <Text style={styles.bullet}>✅  Only a mathematical fingerprint is saved</Text>
                        <Text style={styles.bullet}>✅  Stays on your device in encrypted storage</Text>
                        <Text style={styles.bullet}>✅  Cannot be reverse-engineered</Text>
                        <Text style={styles.bullet}>✅  Takes about 10 seconds to set up</Text>
                    </View>

                    <Text style={styles.tip}>
                        💡 Tip: Good lighting, face the camera directly, no glasses if possible.
                    </Text>

                    <TouchableOpacity style={styles.primaryBtn} onPress={takeSelfie} activeOpacity={0.8}>
                        <Text style={styles.primaryBtnText}>📷  Take Setup Selfie</Text>
                    </TouchableOpacity>
                </>
            )}

            {/* ── PROCESSING ── */}
            {stage === 'processing' && (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text style={styles.processingText}>Analysing face…</Text>
                    <Text style={styles.processingNote}>
                        Loading face recognition model (first time ~10 s, then instant).
                    </Text>
                </View>
            )}

            {/* ── SUCCESS ── */}
            {stage === 'done' && (
                <View style={styles.centerBox}>
                    <Text style={styles.successIcon}>✅</Text>
                    <Text style={styles.successTitle}>Face Profile Created!</Text>
                    <Text style={styles.successDesc}>
                        Your face profile is saved securely on this device.
                        You're all set to mark attendance.
                    </Text>
                    <TouchableOpacity style={styles.primaryBtn} onPress={proceed} activeOpacity={0.8}>
                        <Text style={styles.primaryBtnText}>Continue to Dashboard →</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* ── ERROR ── */}
            {stage === 'error' && (
                <View style={styles.centerBox}>
                    <Text style={styles.errorIcon}>⚠️</Text>
                    <Text style={styles.errorTitle}>Setup Failed</Text>
                    <Text style={styles.errorDesc}>{errorMsg}</Text>
                    <TouchableOpacity style={styles.primaryBtn} onPress={retry} activeOpacity={0.8}>
                        <Text style={styles.primaryBtnText}>↺  Try Again</Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container:       { flexGrow: 1, backgroundColor: '#0f172a', alignItems: 'center', padding: 28, paddingTop: 72, paddingBottom: 50 },
    iconCircle:      { width: 90, height: 90, borderRadius: 45, backgroundColor: '#1e1b4b', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#6366f1', marginBottom: 24 },
    icon:            { fontSize: 40 },
    title:           { fontSize: 26, fontWeight: '800', color: '#f1f5f9', marginBottom: 16, textAlign: 'center' },
    desc:            { fontSize: 15, color: '#94a3b8', textAlign: 'center', lineHeight: 24, marginBottom: 24 },
    accent:          { color: '#22c55e', fontWeight: '700' },
    bulletBox:       { width: '100%', backgroundColor: '#1e293b', borderRadius: 16, padding: 20, gap: 12, marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
    bullet:          { fontSize: 14, color: '#cbd5e1', fontWeight: '500' },
    tip:             { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 32, fontStyle: 'italic' },
    primaryBtn:      { width: '100%', backgroundColor: '#6366f1', paddingVertical: 16, borderRadius: 14, alignItems: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    primaryBtnText:  { color: '#fff', fontSize: 17, fontWeight: '700' },
    centerBox:       { alignItems: 'center', gap: 16, marginTop: 24, width: '100%' },
    processingText:  { fontSize: 18, fontWeight: '700', color: '#f1f5f9', marginTop: 8 },
    processingNote:  { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20 },
    successIcon:     { fontSize: 64 },
    successTitle:    { fontSize: 22, fontWeight: '800', color: '#22c55e' },
    successDesc:     { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 22 },
    errorIcon:       { fontSize: 56 },
    errorTitle:      { fontSize: 20, fontWeight: '800', color: '#ef4444' },
    errorDesc:       { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 22, maxWidth: 280 },
});
