import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';
import { DEFAULT_SERVER_URL, APP_SECRET_HEADER } from '../config';

export default function StudentLoginScreen({ navigation }: any) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        checkExistingStudent();
    }, []);

    const checkExistingStudent = async () => {
        try {
            const savedStudent = await AsyncStorage.getItem('student_user');
            if (savedStudent) {
                navigation.replace('StudentDashboard');
            }
        } catch (e) { }
        finally { setChecking(false); }
    };

    const handleLogin = async () => {
        if (!name.trim()) {
            Alert.alert('Name Required', 'Please enter your full name.');
            return;
        }
        if (!email.trim() || !email.includes('@')) {
            Alert.alert('Invalid Email', 'Please enter your college email address.');
            return;
        }

        setLoading(true);
        try {
            const hardwareId = Platform.OS + '-' + (Device.osInternalBuildId || Device.osBuildId || 'unknown');
            const deviceId = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                hardwareId
            );

            const response = await fetch(`${DEFAULT_SERVER_URL}/api/student/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...APP_SECRET_HEADER },
                body: JSON.stringify({ email: email.toLowerCase().trim(), deviceId })
            });

            const data = await response.json();
            if (data.success) {
                await AsyncStorage.setItem('student_user', JSON.stringify({
                    name: name.trim(),
                    email: email.toLowerCase().trim(),
                    deviceId
                }));
                navigation.replace('StudentDashboard');
            } else {
                Alert.alert('Registration Failed', data.error || 'Failed to register device.');
            }
        } catch (error) {
            Alert.alert('Network Error', 'Check your connection or server URL.');
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
                    <Text style={styles.subtitle}>Use your college email to register</Text>
                </View>

                <View style={styles.card}>
                    <View style={styles.warningBox}>
                        <Text style={styles.warningIcon}>🔒</Text>
                        <Text style={styles.warningText}>This phone will be permanently bound to your email. One phone per student — no sharing allowed.</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Rahul Kumar"
                            placeholderTextColor="#475569"
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>College Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 2023ugcs045@nitjsr.ac.in"
                            placeholderTextColor="#475569"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            textContentType="emailAddress"
                            autoComplete="email"
                        />
                        <Text style={styles.hint}>Must be your official @nitjsr.ac.in email</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.signInBtn, loading && styles.signInBtnDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.signInBtnText}>Sign In & Register Device</Text>
                        )}
                    </TouchableOpacity>
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
    inputGroup: { marginBottom: 20 },
    label: { color: '#94a3b8', fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
    input: { backgroundColor: '#0f172a', borderWidth: 1.5, borderColor: '#334155', borderRadius: 12, padding: 16, color: '#f1f5f9', fontSize: 16 },
    hint: { color: '#64748b', fontSize: 12, marginTop: 6, fontWeight: '500' },
    signInBtn: { backgroundColor: '#6366f1', padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 8, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    signInBtnDisabled: { opacity: 0.6 },
    signInBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
    backBtn: { marginTop: 24, paddingVertical: 12 },
    backText: { color: '#64748b', textAlign: 'center', fontWeight: '600', fontSize: 14 },
});
