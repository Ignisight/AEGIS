import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { GoogleSignin, GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { DEFAULT_SERVER_URL, APP_SECRET_HEADER, FACE_DESCRIPTOR_KEY } from '../config';
import { getFaceConfig } from '../api';

GoogleSignin.configure({
  webClientId: '133030296175-jo6v4cbqupug7dc14sk2g7ob1s2mbgh3.apps.googleusercontent.com',
  offlineAccess: false,
});

export default function StudentLoginScreen({ navigation }: any) {
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        checkExistingStudent();
    }, []);

    const checkExistingStudent = async () => {
        try {
            const savedStudent = await AsyncStorage.getItem('student_user');
            if (savedStudent) {
                // If they have a session, go to dashboard. Face will be handled by scanner.
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'StudentDashboard' }],
                });
            }
        } catch (e) { }
        finally { setChecking(false); }
    };

    const handleGoogleLogin = async () => {
        if (!Device.isDevice) {
            Alert.alert('Security Violation', 'This application can only be used on physical mobile devices.');
            return;
        }

        setLoading(true);
        try {
            await GoogleSignin.hasPlayServices();
            const userInfo: any = await GoogleSignin.signIn();
            const idToken = userInfo?.data?.idToken || userInfo.idToken;
            const userEmail = userInfo?.data?.user?.email || userInfo?.user?.email;

            if (!idToken) {
                throw new Error("Could not get Google ID Token");
            }

            let hardwareId = 'unknown-device';
            if (Platform.OS === 'android') {
                hardwareId = (await Application.getAndroidId()) || 'android-fallback';
            } else if (Platform.OS === 'ios') {
                const iosId = await Application.getIosIdForVendorAsync();
                hardwareId = iosId || 'ios-fallback';
            } else {
                hardwareId = Platform.OS;
            }

            const deviceId = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                hardwareId
            );

            const response = await fetch(`${DEFAULT_SERVER_URL}/api/student/google-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...APP_SECRET_HEADER },
                body: JSON.stringify({ idToken, deviceId })
            });

            const data = await response.json();
            if (data.success) {
                await AsyncStorage.setItem('student_user', JSON.stringify({
                    email:       userEmail,
                    deviceId,
                    name:        data.name        || data.displayName || '',
                    displayName: data.displayName || data.name        || '',
                }));

                const res = await getFaceConfig(userEmail).catch(() => ({ success: false }));
                if (res.success && res.descriptor) {
                    await AsyncStorage.setItem(FACE_DESCRIPTOR_KEY, JSON.stringify(res.descriptor));
                }

                navigation.reset({
                    index: 0,
                    routes: [{ name: 'StudentDashboard' }],
                });
            } else {
                // If the user's email was already bound to another device, sign them out of Google so they can try another account if needed
                await GoogleSignin.signOut().catch(()=>{});
                Alert.alert('Registration Failed', data.error || 'Failed to register device.');
            }
        } catch (error: any) {
            console.log('Google Auth Error:', error);
            if (error.code === 'SIGN_IN_CANCELLED' || error.code === '12501') {
                // User cancelled the login flow
            } else {
                Alert.alert('Network Error', error.message || 'Check your connection or server URL.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (checking) return <View style={styles.container}><ActivityIndicator color="#6366f1" size="large" /></View>;

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <Text style={styles.emoji}>🎓</Text>
                    <Text style={styles.title}>Student Sign In</Text>
                    <Text style={styles.subtitle}>Secure your device with Google</Text>
                </View>

                <View style={styles.card}>
                    <View style={styles.warningBox}>
                        <Text style={styles.warningIcon}>🔒</Text>
                        <Text style={styles.warningText}>This phone will be permanently bound to your email. One phone per student — no sharing allowed.</Text>
                    </View>

                    {loading ? (
                        <ActivityIndicator color="#6366f1" size="large" style={{ marginVertical: 20 }} />
                    ) : (
                        <>
                            <GoogleSigninButton
                                style={{ width: '100%', height: 60, marginTop: 10 }}
                                size={GoogleSigninButton.Size.Wide}
                                color={GoogleSigninButton.Color.Light}
                                onPress={handleGoogleLogin}
                                disabled={loading}
                            />
                            <Text style={styles.hint}>Please use your official college email</Text>
                        </>
                    )}
                </View>

                <TouchableOpacity onPress={() => navigation.navigate('RoleSelection')} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back to Role Selection</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 60, paddingBottom: 40 },
    header: { alignItems: 'center', marginBottom: 32 },
    emoji: { fontSize: 56, marginBottom: 16 },
    title: { fontSize: 30, fontWeight: '800', color: '#f8fafc', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#94a3b8', textAlign: 'center' },
    card: { backgroundColor: '#1e293b', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#334155', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10 },
    warningBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.08)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', padding: 14, borderRadius: 12, marginBottom: 24, gap: 12 },
    warningIcon: { fontSize: 24 },
    warningText: { flex: 1, color: '#fca5a5', fontSize: 12, fontWeight: '500', lineHeight: 18 },
    hint: { color: '#64748b', fontSize: 12, marginTop: 16, fontWeight: '500', textAlign: 'center' },
    backBtn: { marginTop: 24, paddingVertical: 12 },
    backText: { color: '#64748b', textAlign: 'center', fontWeight: '600', fontSize: 14 },
});
