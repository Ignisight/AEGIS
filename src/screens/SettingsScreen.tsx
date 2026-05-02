import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { getServerUrl, setServerUrl, pingServer, saveUser, updateProfile } from '../api';
import { getSecureHeaders } from '../config';

interface SettingsScreenProps {
    navigation: any;
    route: any;
}

export default function SettingsScreen({ navigation, route }: SettingsScreenProps) {
    const { userName, userEmail, userCollege, userDepartment, userAllowedDomain } = route.params || {};
    const [name, setName] = useState(userName || '');
    const [college, setCollege] = useState(userCollege || '');
    const [department, setDepartment] = useState(userDepartment || '');
    const [allowedDomain, setAllowedDomain] = useState(userAllowedDomain || '');

    const [serverUrl, setServerUrlState] = useState(getServerUrl());
    const [testingServer, setTestingServer] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);

    const [saving, setSaving] = useState(false);

    // ---- Profile ----
    const handleSaveProfile = async () => {
        if (!name.trim()) {
            Alert.alert('Required', 'Name cannot be empty.');
            return;
        }
        setSaving(true);
        try {
            const cleanDomain = allowedDomain.replace(/@/g, '').trim().toLowerCase();
            const data = await updateProfile(userEmail, name.trim(), college.trim(), department.trim(), cleanDomain);
            
            if (data.success) {
                Alert.alert('✅ Saved', 'Profile updated successfully.');
                // Update storage so next launch has new data
                await saveUser(data.user);

                // Update route params so HomeScreen picks up the changes
                navigation.navigate('Home', {
                    userName: data.user.name,
                    userEmail: data.user.email,
                    userCollege: data.user.college,
                    userDepartment: data.user.department,
                    userAllowedDomain: data.user.allowedDomain || '',
                });
            } else {
                Alert.alert('Error', data.error || 'Failed to save profile.');
            }
        } catch {
            Alert.alert('Error', 'Could not reach server.');
        } finally {
            setSaving(false);
        }
    };

    // ---- Server ----
    const handleSaveServer = async () => {
        const url = serverUrl.trim();
        if (!url) {
            Alert.alert('Required', 'Server URL cannot be empty.');
            return;
        }
        setTestingServer(true);
        const reachable = await pingServer(url);
        setTestingServer(false);

        if (!reachable) {
            Alert.alert(
                'Unreachable',
                `Could not reach ${url}. Save anyway?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Save Anyway', onPress: () => { setServerUrl(url); Alert.alert('Saved ✅', 'Server URL updated.'); } },
                ]
            );
            return;
        }
        setServerUrl(url);
        Alert.alert('Saved ✅', 'Server URL updated and verified!');
    };

    // ---- Password ----
    const handleChangePassword = async () => {
        if (!currentPassword) {
            Alert.alert('Required', 'Enter your current password.');
            return;
        }
        if (!newPassword || newPassword.length < 4) {
            Alert.alert('Required', 'New password must be at least 4 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Mismatch', 'New password and confirmation do not match.');
            return;
        }
        setSaving(true);
        try {
            const bodyObj = {
                email: userEmail,
                currentPassword,
                newPassword,
            };
            const payloadStr = JSON.stringify(bodyObj);
            const secureHeaders = await getSecureHeaders(payloadStr);

            const res = await fetch(`${getServerUrl()}/api/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...secureHeaders },
                body: payloadStr,
            });
            const data = await res.json();
            if (data.success) {
                Alert.alert('✅ Done', 'Password changed successfully.');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                Alert.alert('Error', data.error || 'Failed to change password.');
            }
        } catch {
            Alert.alert('Error', 'Could not reach server.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Settings</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

                {/* ====== PROFILE SECTION ====== */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionIcon}>👤</Text>
                        <Text style={styles.sectionTitle}>Profile</Text>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Your name"
                            placeholderTextColor="#475569"
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Email</Text>
                        <View style={[styles.input, styles.inputReadonly]}>
                            <Text style={styles.readonlyText}>{userEmail || '—'}</Text>
                        </View>
                        <Text style={styles.hint}>Email cannot be changed</Text>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>College / Institution</Text>
                        <TextInput
                            style={styles.input}
                            value={college}
                            onChangeText={setCollege}
                            placeholder="e.g. NIT Jamshedpur"
                            placeholderTextColor="#475569"
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Department</Text>
                        <TextInput
                            style={styles.input}
                            value={department}
                            onChangeText={setDepartment}
                            placeholder="e.g. Computer Science"
                            placeholderTextColor="#475569"
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Allowed Student Domain</Text>
                        <TextInput
                            style={styles.input}
                            value={allowedDomain}
                            onChangeText={(text) => setAllowedDomain(text.replace(/@/g, ''))}
                            placeholder="e.g. nitjsr.ac.in"
                            placeholderTextColor="#475569"
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                        />
                        <Text style={styles.hint}>Only students with this email domain can mark attendance. Leave blank to allow all domains.</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                        onPress={handleSaveProfile}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.saveBtnText}>💾 Save Profile</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* ====== SERVER SECTION ====== */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionIcon}>🌐</Text>
                        <Text style={styles.sectionTitle}>Server</Text>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Server URL</Text>
                        <TextInput
                            style={styles.input}
                            value={serverUrl}
                            onChangeText={setServerUrlState}
                            placeholder="https://your-server.onrender.com"
                            placeholderTextColor="#475569"
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="url"
                        />
                        <Text style={styles.hint}>The backend server where attendance data is stored</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveBtn, styles.serverBtn, testingServer && styles.saveBtnDisabled]}
                        onPress={handleSaveServer}
                        disabled={testingServer}
                    >
                        {testingServer ? (
                            <View style={styles.row}>
                                <ActivityIndicator color="#fff" size="small" />
                                <Text style={styles.saveBtnText}>  Testing connection...</Text>
                            </View>
                        ) : (
                            <Text style={styles.saveBtnText}>🔗 Test & Save</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* ====== PASSWORD SECTION ====== */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionIcon}>🔒</Text>
                        <Text style={styles.sectionTitle}>Change Password</Text>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Current Password</Text>
                        <View style={styles.passwordRow}>
                            <TextInput
                                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                placeholder="Enter current password"
                                placeholderTextColor="#475569"
                                secureTextEntry={!showCurrentPw}
                            />
                            <TouchableOpacity
                                style={styles.eyeBtn}
                                onPress={() => setShowCurrentPw(!showCurrentPw)}
                            >
                                <Text style={styles.eyeText}>{showCurrentPw ? '🙈' : '👁️'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>New Password</Text>
                        <View style={styles.passwordRow}>
                            <TextInput
                                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                placeholder="At least 4 characters"
                                placeholderTextColor="#475569"
                                secureTextEntry={!showNewPw}
                            />
                            <TouchableOpacity
                                style={styles.eyeBtn}
                                onPress={() => setShowNewPw(!showNewPw)}
                            >
                                <Text style={styles.eyeText}>{showNewPw ? '🙈' : '👁️'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Confirm New Password</Text>
                        <TextInput
                            style={styles.input}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder="Re-enter new password"
                            placeholderTextColor="#475569"
                            secureTextEntry={!showNewPw}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.saveBtn, styles.passwordBtn, saving && styles.saveBtnDisabled]}
                        onPress={handleChangePassword}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.saveBtnText}>🔐 Change Password</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* ====== ABOUT SECTION ====== */}
                <View style={[styles.section, { borderColor: '#1e293b' }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionIcon}>ℹ️</Text>
                        <Text style={styles.sectionTitle}>About</Text>
                    </View>
                    <View style={styles.aboutRow}>
                        <Text style={styles.aboutLabel}>Version</Text>
                        <Text style={styles.aboutValue}>2.4.1</Text>
                    </View>
                    <View style={styles.aboutRow}>
                        <Text style={styles.aboutLabel}>Email Domain</Text>
                        <Text style={styles.aboutValue}>{userAllowedDomain ? `@${userAllowedDomain}` : 'All allowed'}</Text>
                    </View>
                    <View style={styles.aboutRow}>
                        <Text style={styles.aboutLabel}>App ID</Text>
                        <Text style={styles.aboutValue}>com.attendance.system</Text>
                    </View>
                    <View style={styles.aboutRow}>
                        <Text style={styles.aboutLabel}>Device Binding</Text>
                        <Text style={[styles.aboutValue, { color: '#22c55e' }]}>✅ Active</Text>
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
        paddingTop: 56, paddingBottom: 12,
    },
    backBtn: { padding: 8, marginRight: 8 },
    backText: { color: '#94a3b8', fontSize: 16, fontWeight: '600' },
    title: { flex: 1, fontSize: 22, fontWeight: '700', color: '#f1f5f9' },

    scrollContent: { padding: 20, paddingTop: 8, paddingBottom: 40 },

    section: {
        backgroundColor: '#1e293b', borderRadius: 20, padding: 24,
        marginBottom: 16, borderWidth: 1, borderColor: '#334155',
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    sectionIcon: { fontSize: 22 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#f1f5f9' },

    field: { marginBottom: 16 },
    label: {
        fontSize: 12, fontWeight: '600', color: '#94a3b8',
        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
    },
    input: {
        backgroundColor: '#0f172a', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 14,
        fontSize: 15, color: '#f1f5f9',
        borderWidth: 1.5, borderColor: '#334155',
    },
    inputReadonly: {
        backgroundColor: '#1e293b', borderColor: '#475569',
        justifyContent: 'center',
    },
    readonlyText: { fontSize: 15, color: '#64748b' },
    hint: { fontSize: 11, color: '#475569', marginTop: 6 },

    passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    eyeBtn: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155',
        justifyContent: 'center', alignItems: 'center',
    },
    eyeText: { fontSize: 18 },

    saveBtn: {
        backgroundColor: '#6366f1', paddingVertical: 14,
        borderRadius: 12, alignItems: 'center', marginTop: 8,
    },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    serverBtn: { backgroundColor: '#059669' },
    passwordBtn: { backgroundColor: '#dc2626' },
    row: { flexDirection: 'row', alignItems: 'center' },

    aboutRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#0f172a',
    },
    aboutLabel: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },
    aboutValue: { fontSize: 14, color: '#e2e8f0', fontWeight: '600' },
});
