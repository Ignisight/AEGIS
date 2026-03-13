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
} from 'react-native';
import { login, saveUser } from '../api';

interface LoginScreenProps {
    navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!email.trim() || !password) {
            Alert.alert('Required', 'Please enter your email and password.');
            return;
        }

        setLoading(true);
        try {
            const result = await login(email.trim(), password);
            if (result.success) {
                await saveUser(result.user);
                navigation.replace('Home', {
                    userName: result.user.name,
                    userEmail: result.user.email,
                    userCollege: result.user.college || '',
                    userDepartment: result.user.department || '',
                    userAllowedDomain: result.user.allowedDomain || '',
                });
            } else {
                Alert.alert('Login Failed', result.error || 'Invalid credentials');
            }
        } catch (err: any) {
            Alert.alert('Connection Error', 'Cannot reach the server. Please check your internet connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.inner}>
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <View style={styles.logoCircle}>
                        <Text style={styles.logoText}>📋</Text>
                    </View>
                    <Text style={styles.title}>Attendance</Text>
                    <Text style={styles.subtitle}>Teacher Login</Text>
                </View>

                {/* Email */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="you@college.edu"
                        placeholderTextColor="#475569"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        editable={!loading}
                    />
                </View>

                {/* Password with eye toggle */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.passwordRow}>
                        <TextInput
                            style={styles.passwordInput}
                            placeholder="Enter password"
                            placeholderTextColor="#475569"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            editable={!loading}
                        />
                        <TouchableOpacity
                            onPress={() => setShowPassword(!showPassword)}
                            style={styles.eyeBtn}
                        >
                            <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Forgot Password */}
                <TouchableOpacity
                    onPress={() => navigation.navigate('ForgotPassword')}
                    style={styles.forgotBtn}
                >
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>

                {/* Login Button */}
                <TouchableOpacity
                    style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <View style={styles.row}>
                            <ActivityIndicator color="#fff" size="small" />
                            <Text style={styles.loginBtnText}>  Signing in...</Text>
                        </View>
                    ) : (
                        <Text style={styles.loginBtnText}>Login →</Text>
                    )}
                </TouchableOpacity>

                {/* Register Link */}
                <TouchableOpacity
                    onPress={() => navigation.navigate('Register')}
                    style={styles.registerLink}
                >
                    <Text style={styles.registerText}>
                        Don't have an account? <Text style={styles.registerHighlight}>Create one</Text>
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => navigation.navigate('RoleSelection')}
                    style={{ marginTop: 20, paddingVertical: 12 }}
                >
                    <Text style={{ color: '#64748b', textAlign: 'center', fontWeight: '600', fontSize: 14 }}>← Back to Role Selection</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    inner: { flex: 1, justifyContent: 'center', padding: 28 },
    logoContainer: { alignItems: 'center', marginBottom: 40 },
    logoCircle: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: '#312e81',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
    },
    logoText: { fontSize: 36 },
    title: { fontSize: 28, fontWeight: '800', color: '#f1f5f9' },
    subtitle: { fontSize: 15, color: '#64748b', marginTop: 4 },
    fieldGroup: { marginBottom: 18 },
    label: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: {
        width: '100%', backgroundColor: '#1e293b', borderRadius: 14,
        paddingHorizontal: 18, paddingVertical: 15,
        fontSize: 16, color: '#f1f5f9',
        borderWidth: 1.5, borderColor: '#334155',
    },
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
    forgotBtn: { alignSelf: 'flex-end', marginBottom: 20 },
    forgotText: { color: '#818cf8', fontSize: 14, fontWeight: '600' },
    loginBtn: {
        backgroundColor: '#6366f1', paddingVertical: 17,
        borderRadius: 14, alignItems: 'center',
        shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
    },
    loginBtnDisabled: { opacity: 0.6 },
    loginBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
    row: { flexDirection: 'row', alignItems: 'center' },
    registerLink: { alignItems: 'center', marginTop: 24 },
    registerText: { color: '#64748b', fontSize: 15 },
    registerHighlight: { color: '#818cf8', fontWeight: '700' },
});
