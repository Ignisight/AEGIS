import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { forgotPassword, resetPassword } from '../api';

interface ForgotPasswordScreenProps {
    navigation: any;
}

export default function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
    const [step, setStep] = useState<'email' | 'otp'>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleSendOtp = async () => {
        if (!email.trim()) {
            Alert.alert('Required', 'Please enter your email.');
            return;
        }

        setLoading(true);
        try {
            const result = await forgotPassword(email.trim());
            if (result.success) {
                setStep('otp');
                Alert.alert('OTP Sent ✅', 'Check your email for the 6-digit code.');
            } else {
                Alert.alert('Error', result.error || 'Could not send OTP');
            }
        } catch (err: any) {
            Alert.alert('Connection Error', 'Cannot reach the server.');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        if (!otp || !newPassword || !confirmPassword) {
            Alert.alert('Required', 'Please fill in all fields.');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Mismatch', 'Passwords do not match.');
            return;
        }

        if (newPassword.length < 4) {
            Alert.alert('Too Short', 'Password must be at least 4 characters.');
            return;
        }

        setLoading(true);
        try {
            const result = await resetPassword(email.trim(), otp, newPassword);
            if (result.success) {
                Alert.alert('Password Reset! ✅', 'You can now login with your new password.', [
                    { text: 'Go to Login', onPress: () => navigation.navigate('Login') },
                ]);
            } else {
                Alert.alert('Error', result.error || 'Reset failed');
            }
        } catch (err: any) {
            Alert.alert('Connection Error', 'Cannot reach the server.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>

                <View style={styles.logoContainer}>
                    <Text style={styles.icon}>🔒</Text>
                    <Text style={styles.title}>
                        {step === 'email' ? 'Forgot Password' : 'Reset Password'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {step === 'email'
                            ? 'Enter your email to get a reset code'
                            : 'Enter the OTP and your new password'}
                    </Text>
                </View>

                {step === 'email' ? (
                    <>
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="you@college.edu"
                                placeholderTextColor="#475569"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                editable={!loading}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.actionBtn, loading && styles.actionBtnDisabled]}
                            onPress={handleSendOtp}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <View style={styles.row}>
                                    <ActivityIndicator color="#fff" size="small" />
                                    <Text style={styles.actionBtnText}>  Sending...</Text>
                                </View>
                            ) : (
                                <Text style={styles.actionBtnText}>Send OTP</Text>
                            )}
                        </TouchableOpacity>
                    </>
                ) : (
                    <>

                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>OTP Code</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="6-digit code"
                                placeholderTextColor="#475569"
                                value={otp}
                                onChangeText={setOtp}
                                keyboardType="number-pad"
                                maxLength={6}
                                editable={!loading}
                            />
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>New Password</Text>
                            <View style={styles.passwordRow}>
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Min 4 characters"
                                    placeholderTextColor="#475569"
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    secureTextEntry={!showPassword}
                                    editable={!loading}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                                    <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Confirm Password</Text>
                            <View style={styles.passwordRow}>
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Re-enter password"
                                    placeholderTextColor="#475569"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showConfirm}
                                    editable={!loading}
                                />
                                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                                    <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁️'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.actionBtn, loading && styles.actionBtnDisabled]}
                            onPress={handleReset}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <View style={styles.row}>
                                    <ActivityIndicator color="#fff" size="small" />
                                    <Text style={styles.actionBtnText}>  Resetting...</Text>
                                </View>
                            ) : (
                                <Text style={styles.actionBtnText}>Reset Password</Text>
                            )}
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    inner: { padding: 28, paddingTop: 56, paddingBottom: 40 },
    backBtn: { marginBottom: 20 },
    backText: { color: '#94a3b8', fontSize: 16, fontWeight: '600' },
    logoContainer: { alignItems: 'center', marginBottom: 32 },
    icon: { fontSize: 48, marginBottom: 12 },
    title: { fontSize: 26, fontWeight: '800', color: '#f1f5f9' },
    subtitle: { fontSize: 14, color: '#64748b', marginTop: 6, textAlign: 'center' },
    fieldGroup: { marginBottom: 18 },
    label: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: {
        width: '100%', backgroundColor: '#1e293b', borderRadius: 14,
        paddingHorizontal: 18, paddingVertical: 15,
        fontSize: 16, color: '#f1f5f9',
        borderWidth: 1.5, borderColor: '#334155',
    },
    actionBtn: {
        backgroundColor: '#6366f1', paddingVertical: 17,
        borderRadius: 14, alignItems: 'center', marginTop: 8,
        shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
    },
    actionBtnDisabled: { opacity: 0.6 },
    actionBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
    row: { flexDirection: 'row', alignItems: 'center' },
    passwordRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#1e293b', borderRadius: 14,
        borderWidth: 1.5, borderColor: '#334155',
    },
    passwordInput: {
        flex: 1, paddingHorizontal: 18, paddingVertical: 15,
        fontSize: 16, color: '#f1f5f9',
    },
    eyeBtn: { paddingHorizontal: 14, paddingVertical: 12 },
    eyeIcon: { fontSize: 20 },
    otpHint: {
        backgroundColor: '#1e293b', borderRadius: 14, padding: 16,
        marginBottom: 20, alignItems: 'center',
        borderWidth: 1.5, borderColor: '#22c55e',
    },
    otpHintLabel: { fontSize: 13, color: '#94a3b8', marginBottom: 8 },
    otpHintCode: { fontSize: 32, fontWeight: '800', color: '#22c55e', letterSpacing: 8 },
});
