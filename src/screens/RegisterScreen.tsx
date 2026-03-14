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
import { register } from '../api';

interface RegisterScreenProps {
    navigation: any;
}

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [college, setCollege] = useState('NIT Jamshedpur');
    const [department, setDepartment] = useState('');
    const [allowedDomain, setAllowedDomain] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleRegister = async () => {
        if (!name.trim() || !email.trim() || !password || !confirmPassword) {
            Alert.alert('Required', 'Please fill in all required fields.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Mismatch', 'Passwords do not match.');
            return;
        }
        if (password.length < 4) {
            Alert.alert('Too Short', 'Password must be at least 4 characters.');
            return;
        }

        setLoading(true);
        try {
            const result = await register(
                name.trim(),
                email.trim(),
                password,
                college.trim(),
                department.trim(),
                allowedDomain.trim()
            );
            if (result.success) {
                Alert.alert('Account Created! ✅', 'You can now login with your credentials.', [
                    { text: 'Go to Login', onPress: () => navigation.goBack() },
                ]);
            } else {
                Alert.alert('Error', result.error || 'Registration failed');
            }
        } catch (err: any) {
            Alert.alert('Connection Error', 'Cannot reach the server. Please try again.');
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
                    <Text style={styles.backText}>← Back to Login</Text>
                </TouchableOpacity>

                <View style={styles.logoContainer}>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Sign up to get started</Text>
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Full Name *</Text>
                    <TextInput style={styles.input} placeholder="Dr. Sharma" placeholderTextColor="#475569"
                        value={name} onChangeText={setName} editable={!loading} />
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Email *</Text>
                    <TextInput style={styles.input} placeholder="you@college.edu" placeholderTextColor="#475569"
                        value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" editable={!loading} />
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>College</Text>
                    <TextInput style={styles.input} placeholder="NIT Jamshedpur" placeholderTextColor="#475569"
                        value={college} onChangeText={setCollege} editable={!loading} />
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Department</Text>
                    <TextInput style={styles.input} placeholder="e.g. Computer Science" placeholderTextColor="#475569"
                        value={department} onChangeText={setDepartment} editable={!loading} />
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Institutional Domain</Text>
                    <TextInput style={styles.input} placeholder="e.g. nitjsr.ac.in" placeholderTextColor="#475569"
                        value={allowedDomain} onChangeText={setAllowedDomain} autoCapitalize="none" editable={!loading} />
                    <Text style={styles.fieldHint}>Restricts attendance to students with this email domain.</Text>
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Password *</Text>
                    <View style={styles.passwordRow}>
                        <TextInput style={styles.passwordInput} placeholder="Min 4 characters" placeholderTextColor="#475569"
                            value={password} onChangeText={setPassword} secureTextEntry={!showPassword} editable={!loading} />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                            <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Confirm Password *</Text>
                    <View style={styles.passwordRow}>
                        <TextInput style={styles.passwordInput} placeholder="Re-enter password" placeholderTextColor="#475569"
                            value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirm} editable={!loading} />
                        <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                            <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁️'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.registerBtn, loading && styles.registerBtnDisabled]}
                    onPress={handleRegister} disabled={loading} activeOpacity={0.8}
                >
                    {loading ? (
                        <View style={styles.row}>
                            <ActivityIndicator color="#fff" size="small" />
                            <Text style={styles.registerBtnText}>  Creating...</Text>
                        </View>
                    ) : (
                        <Text style={styles.registerBtnText}>Create Account</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    inner: { padding: 28, paddingTop: 56, paddingBottom: 40 },
    backBtn: { marginBottom: 20 },
    backText: { color: '#94a3b8', fontSize: 16, fontWeight: '600' },
    logoContainer: { alignItems: 'center', marginBottom: 28 },
    title: { fontSize: 26, fontWeight: '800', color: '#f1f5f9' },
    subtitle: { fontSize: 15, color: '#64748b', marginTop: 4 },
    fieldGroup: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: {
        width: '100%', backgroundColor: '#1e293b', borderRadius: 14,
        paddingHorizontal: 18, paddingVertical: 14,
        fontSize: 16, color: '#f1f5f9',
        borderWidth: 1.5, borderColor: '#334155',
    },
    passwordRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#1e293b', borderRadius: 14,
        borderWidth: 1.5, borderColor: '#334155',
    },
    passwordInput: {
        flex: 1, paddingHorizontal: 18, paddingVertical: 14,
        fontSize: 16, color: '#f1f5f9',
    },
    eyeBtn: { paddingHorizontal: 14, paddingVertical: 12 },
    eyeIcon: { fontSize: 20 },
    registerBtn: {
        backgroundColor: '#6366f1', paddingVertical: 17,
        borderRadius: 14, alignItems: 'center', marginTop: 8,
        shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
    },
    registerBtnDisabled: { opacity: 0.6 },
    registerBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
    row: { flexDirection: 'row', alignItems: 'center' },
    fieldHint: { fontSize: 12, color: '#64748b', marginTop: 4, marginLeft: 2 },
});
