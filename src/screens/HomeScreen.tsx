import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView,
    Animated,
    Dimensions,
} from 'react-native';
import { startSession, getServerUrl, clearUser } from '../api';
import * as Location from 'expo-location';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.82;

interface HomeScreenProps {
    navigation: any;
    route: any;
}

export default function HomeScreen({ navigation, route }: HomeScreenProps) {
    const { userName, userEmail, userCollege, userDepartment } = route.params || {};
    const [sessionName, setSessionName] = useState('');
    const [loading, setLoading] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const overlayAnim = useRef(new Animated.Value(0)).current;

    const openDrawer = () => {
        setDrawerOpen(true);
        Animated.parallel([
            Animated.spring(drawerAnim, { toValue: 0, useNativeDriver: true, damping: 20 }),
            Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();
    };

    const closeDrawer = () => {
        Animated.parallel([
            Animated.spring(drawerAnim, { toValue: -DRAWER_WIDTH, useNativeDriver: true, damping: 20 }),
            Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => setDrawerOpen(false));
    };

    const handleLogout = async () => {
        await clearUser();
        closeDrawer();
        setTimeout(() => navigation.replace('Login'), 300);
    };

    const openHistory = () => {
        closeDrawer();
        setTimeout(() => navigation.navigate('History'), 300);
    };

    const openSettings = () => {
        closeDrawer();
        setTimeout(() => navigation.navigate('Settings', {
            userName, userEmail, userCollege, userDepartment,
        }), 300);
    };

    const handleStart = async () => {
        const trimmed = sessionName.trim();
        if (!trimmed) { Alert.alert('Required', 'Please enter a session name.'); return; }

        setLoading(true);
        try {
            // 1. Try to get GPS with strict 5-second timeout
            let latitude, longitude;

            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    // Race: GPS vs 5-second timeout
                    const locationPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('GPS timeout')), 5000));

                    const location: any = await Promise.race([locationPromise, timeoutPromise]);
                    latitude = location.coords.latitude;
                    longitude = location.coords.longitude;
                }
            } catch (locErr) {
                // GPS failed or timed out — continue without it
                console.log('GPS skipped:', locErr);
            }

            // 2. Start Session (with or without coords)
            try {
                const result = await startSession(trimmed, latitude, longitude);
                if (result.error) { Alert.alert('Error', result.error); return; }
                if (result.success) {
                    navigation.navigate('Session', {
                        sessionName: trimmed,
                        formUrl: result.formUrl,
                        sessionId: result.sessionId,
                    });
                    setSessionName('');
                }
            } catch (serverErr) {
                Alert.alert('Connection Error', 'Could not reach the server. Check Settings → Server URL.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={openDrawer} style={styles.menuBtn}>
                        <Text style={styles.menuIcon}>☰</Text>
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.greeting}>👋 Hi, {userName || 'Teacher'}</Text>
                        <Text style={styles.subGreeting}>{userCollege || 'NIT Jamshedpur'}</Text>
                    </View>
                </View>

                {/* Start Attendance Card */}
                <View style={styles.card}>
                    <View style={styles.cardIcon}>
                        <Text style={styles.cardIconText}>🎓</Text>
                    </View>
                    <Text style={styles.cardTitle}>Start Attendance</Text>
                    <Text style={styles.cardDesc}>
                        Enter a session name and tap Start. Students scan the QR to submit attendance.
                    </Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Session Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder='e.g. "MECH 6th Sem – Thermo – P3"'
                            placeholderTextColor="#64748b"
                            value={sessionName}
                            onChangeText={setSessionName}
                            editable={!loading}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.startBtn, (!sessionName.trim() || loading) && styles.startBtnDisabled]}
                        onPress={handleStart}
                        disabled={!sessionName.trim() || loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator color="#fff" size="small" />
                                <Text style={styles.startBtnText}>  Starting...</Text>
                            </View>
                        ) : (
                            <Text style={styles.startBtnText}>▶  Start Attendance</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Quick Actions */}
                <View style={styles.infoRow}>
                    <TouchableOpacity style={styles.infoCard} onPress={openHistory}>
                        <Text style={styles.infoIcon}>📊</Text>
                        <Text style={styles.infoTitle}>History</Text>
                        <Text style={styles.infoDesc}>Past 2 days records</Text>
                    </TouchableOpacity>
                    <View style={styles.infoCard}>
                        <Text style={styles.infoIcon}>☁️</Text>
                        <Text style={styles.infoTitle}>Cloud Server</Text>
                        <Text style={styles.infoDesc}>Always available</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Drawer */}
            {drawerOpen && (
                <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                    <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
                        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDrawer} />
                    </Animated.View>

                    <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
                        <ScrollView contentContainerStyle={styles.drawerContent}>
                            {/* Profile Header */}
                            <View style={styles.profileCard}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>
                                        {(userName || 'T').charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                                <Text style={styles.profileName}>{userName || 'Teacher'}</Text>
                                <Text style={styles.profileEmail}>{userEmail || ''}</Text>
                                <View style={styles.profileMeta}>
                                    {userCollege ? (
                                        <View style={styles.metaRow}>
                                            <Text style={styles.metaIcon}>🏛️</Text>
                                            <Text style={styles.metaText}>{userCollege}</Text>
                                        </View>
                                    ) : null}
                                    {userDepartment ? (
                                        <View style={styles.metaRow}>
                                            <Text style={styles.metaIcon}>📚</Text>
                                            <Text style={styles.metaText}>{userDepartment}</Text>
                                        </View>
                                    ) : null}
                                </View>
                            </View>

                            <View style={styles.divider} />

                            {/* Menu Items */}
                            <TouchableOpacity style={styles.menuItem} onPress={openHistory}>
                                <Text style={styles.menuItemIcon}>📊</Text>
                                <View style={styles.menuItemContent}>
                                    <Text style={styles.menuItemTitle}>Session History</Text>
                                    <Text style={styles.menuItemDesc}>View past 2 days of records</Text>
                                </View>
                                <Text style={styles.menuItemArrow}>›</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem} onPress={openSettings}>
                                <Text style={styles.menuItemIcon}>⚙️</Text>
                                <View style={styles.menuItemContent}>
                                    <Text style={styles.menuItemTitle}>Settings</Text>
                                    <Text style={styles.menuItemDesc}>Profile, Server, Password</Text>
                                </View>
                                <Text style={styles.menuItemArrow}>›</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem} onPress={() => { closeDrawer(); setTimeout(() => navigation.navigate('RoleSelection'), 300); }}>
                                <Text style={styles.menuItemIcon}>🔄</Text>
                                <View style={styles.menuItemContent}>
                                    <Text style={styles.menuItemTitle}>Switch to Student</Text>
                                    <Text style={styles.menuItemDesc}>Scan QR as a student</Text>
                                </View>
                                <Text style={styles.menuItemArrow}>›</Text>
                            </TouchableOpacity>

                            <View style={styles.divider} />

                            {/* Logout */}
                            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                                <Text style={styles.logoutText}>🚪  Logout</Text>
                            </TouchableOpacity>

                            <Text style={styles.versionText}>Attendance System v2.1</Text>
                        </ScrollView>
                    </Animated.View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    scrollContent: { padding: 20, paddingTop: 60, paddingBottom: 40 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 28, gap: 12 },
    menuBtn: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: '#334155',
    },
    menuIcon: { fontSize: 22, color: '#f1f5f9' },
    greeting: { fontSize: 22, fontWeight: '700', color: '#f1f5f9' },
    subGreeting: { fontSize: 13, color: '#64748b', marginTop: 2 },
    card: { backgroundColor: '#1e293b', borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
    cardIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#312e81', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    cardIconText: { fontSize: 28 },
    cardTitle: { fontSize: 22, fontWeight: '700', color: '#f1f5f9', marginBottom: 8 },
    cardDesc: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    inputGroup: { width: '100%', marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#cbd5e1', marginBottom: 8 },
    input: { width: '100%', backgroundColor: '#0f172a', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14, fontSize: 16, color: '#f1f5f9', borderWidth: 1.5, borderColor: '#334155' },
    startBtn: { width: '100%', backgroundColor: '#6366f1', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
    startBtnDisabled: { backgroundColor: '#3730a3', opacity: 0.5 },
    startBtnText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
    loadingRow: { flexDirection: 'row', alignItems: 'center' },
    infoRow: { flexDirection: 'row', gap: 12 },
    infoCard: { flex: 1, backgroundColor: '#1e293b', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    infoIcon: { fontSize: 28, marginBottom: 8 },
    infoTitle: { fontSize: 14, fontWeight: '700', color: '#e2e8f0', marginBottom: 4 },
    infoDesc: { fontSize: 11, color: '#64748b', textAlign: 'center' },

    // Drawer
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
    drawer: {
        position: 'absolute', top: 0, bottom: 0, left: 0,
        width: DRAWER_WIDTH, backgroundColor: '#1e293b',
        borderRightWidth: 1, borderRightColor: '#334155',
        elevation: 20, shadowColor: '#000', shadowOffset: { width: 8, height: 0 },
        shadowOpacity: 0.5, shadowRadius: 24,
    },
    drawerContent: { paddingTop: 56, paddingBottom: 40, paddingHorizontal: 24 },

    // Profile card
    profileCard: {
        alignItems: 'center', paddingBottom: 20,
        backgroundColor: '#0f172a', borderRadius: 20, padding: 24,
        borderWidth: 1, borderColor: '#334155',
    },
    avatar: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center',
        marginBottom: 14, borderWidth: 3, borderColor: '#818cf8',
    },
    avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
    profileName: { fontSize: 20, fontWeight: '700', color: '#f1f5f9' },
    profileEmail: { fontSize: 13, color: '#64748b', marginTop: 4 },
    profileMeta: { marginTop: 14, gap: 8 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    metaIcon: { fontSize: 16 },
    metaText: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },

    divider: { height: 1, backgroundColor: '#334155', marginVertical: 16 },

    // Menu items
    menuItem: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingVertical: 14, paddingHorizontal: 4,
    },
    menuItemIcon: { fontSize: 24 },
    menuItemContent: { flex: 1 },
    menuItemTitle: { fontSize: 16, fontWeight: '600', color: '#f1f5f9' },
    menuItemDesc: { fontSize: 12, color: '#64748b', marginTop: 2 },
    menuItemArrow: { fontSize: 24, color: '#475569', fontWeight: '300' },

    // Server settings
    drawerSectionTitle: { fontSize: 14, fontWeight: '700', color: '#e2e8f0', marginBottom: 12 },
    drawerFieldGroup: { marginBottom: 8 },
    drawerLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' },
    drawerInput: {
        backgroundColor: '#0f172a', borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 12,
        fontSize: 14, color: '#f1f5f9',
        borderWidth: 1, borderColor: '#334155',
    },
    saveServerBtn: {
        marginTop: 10, backgroundColor: '#6366f1',
        paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    },
    saveServerBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

    logoutBtn: {
        backgroundColor: '#450a0a', paddingVertical: 14,
        borderRadius: 12, alignItems: 'center',
        borderWidth: 1, borderColor: '#dc2626',
    },
    logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '700' },
    versionText: { textAlign: 'center', color: '#334155', fontSize: 12, marginTop: 20 },
});
