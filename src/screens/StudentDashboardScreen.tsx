import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated, Dimensions, TouchableWithoutFeedback } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.78;

export default function StudentDashboardScreen({ navigation }: any) {
    const [student, setStudent] = useState<{ name: string; email: string; deviceId: string } | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const overlayAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadStudent();
    }, []);

    const loadStudent = async () => {
        try {
            const saved = await AsyncStorage.getItem('student_user');
            if (saved) {
                const parsed = JSON.parse(saved);
                setStudent(parsed);
            } else {
                navigation.replace('StudentLogin');
            }
        } catch (e) {
            navigation.replace('StudentLogin');
        }
    };

    const openDrawer = () => {
        setDrawerOpen(true);
        Animated.parallel([
            Animated.spring(drawerAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
            Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();
    };

    const closeDrawer = () => {
        Animated.parallel([
            Animated.spring(drawerAnim, { toValue: -DRAWER_WIDTH, useNativeDriver: true, tension: 65, friction: 11 }),
            Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => setDrawerOpen(false));
    };

    const handleLogout = () => {
        closeDrawer();
        setTimeout(() => {
            Alert.alert(
                'Sign Out',
                'This will remove your device binding. You will need to sign in again.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Sign Out',
                        style: 'destructive',
                        onPress: async () => {
                            await AsyncStorage.removeItem('student_user');
                            navigation.replace('RoleSelection');
                        }
                    }
                ]
            );
        }, 300);
    };

    // Parse email: 2022UGCM030@nitjsr.ac.in
    // Format: {4-digit year}{UG|PG}{branch letters}{reg digits}@domain
    const getStudentInfo = () => {
        if (!student) return { regNo: '', year: '', program: '', branch: '' };
        const prefix = student.email.split('@')[0].toUpperCase();

        // Extract year (first 4 digits)
        const yearMatch = prefix.match(/^(\d{4})/);
        const year = yearMatch ? yearMatch[1] : '';
        const afterYear = prefix.slice(year.length);

        // Extract program (UG or PG)
        let program = '';
        let afterProgram = afterYear;
        if (afterYear.startsWith('UG')) {
            program = 'Undergraduate (UG)';
            afterProgram = afterYear.slice(2);
        } else if (afterYear.startsWith('PG')) {
            program = 'Postgraduate (PG)';
            afterProgram = afterYear.slice(2);
        }

        // Extract branch (letters) and reg number (trailing digits)
        const branchRegMatch = afterProgram.match(/^([A-Z]+)(\d+)$/);
        let branchCode = '';
        let regNo = '';
        if (branchRegMatch) {
            branchCode = branchRegMatch[1];
            regNo = branchRegMatch[2];
        } else {
            branchCode = afterProgram.replace(/\d+/g, '');
            regNo = afterProgram.replace(/[A-Z]+/gi, '');
        }

        return {
            regNo: prefix,
            year,
            program,
            branchCode,
            regNumber: regNo
        };
    };

    if (!student) return <View style={styles.container} />;

    const info = getStudentInfo();

    return (
        <View style={styles.container}>
            {/* ===== MAIN CONTENT ===== */}
            <View style={styles.mainContent}>
                {/* Top Bar */}
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={openDrawer} style={styles.hamburgerBtn} activeOpacity={0.7}>
                        <Text style={styles.hamburgerIcon}>☰</Text>
                    </TouchableOpacity>
                    <Text style={styles.topBarTitle}>Student Dashboard</Text>
                    <View style={{ width: 44 }} />
                </View>

                {/* Welcome */}
                <View style={styles.welcomeSection}>
                    <Text style={styles.welcomeText}>Welcome back,</Text>
                    <Text style={styles.welcomeName}>{info.regNo} 👋</Text>
                </View>

                {/* Scan QR Button */}
                <TouchableOpacity
                    style={styles.scanBtn}
                    onPress={() => navigation.navigate('StudentScanner')}
                    activeOpacity={0.8}
                >
                    <View style={styles.scanIconCircle}>
                        <Text style={styles.scanIcon}>📷</Text>
                    </View>
                    <Text style={styles.scanTitle}>Scan Attendance QR</Text>
                    <Text style={styles.scanDesc}>Tap to open your camera and scan the teacher's QR code displayed in class</Text>
                </TouchableOpacity>

                {/* Gallery Upload */}
                <TouchableOpacity
                    style={styles.galleryBtn}
                    onPress={() => navigation.navigate('StudentScanner')}
                    activeOpacity={0.8}
                >
                    <Text style={styles.galleryBtnText}>🖼️  Or upload QR from Gallery</Text>
                </TouchableOpacity>
            </View>

            {/* ===== DRAWER OVERLAY ===== */}
            {drawerOpen && (
                <TouchableWithoutFeedback onPress={closeDrawer}>
                    <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} />
                </TouchableWithoutFeedback>
            )}

            {/* ===== DRAWER ===== */}
            <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
                {/* Profile Header */}
                <View style={styles.drawerProfile}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{info.regNo ? info.regNo.charAt(0).toUpperCase() : 'S'}</Text>
                    </View>
                    <Text style={styles.drawerName}>{info.regNo}</Text>
                    <Text style={styles.drawerEmail}>{student.email}</Text>
                </View>

                {/* Info Items */}
                <View style={styles.drawerBody}>
                    <View style={styles.drawerInfoItem}>
                        <Text style={styles.drawerInfoLabel}>Registration No.</Text>
                        <Text style={styles.drawerInfoValue}>{info.regNo}</Text>
                    </View>
                    <View style={styles.drawerInfoItem}>
                        <Text style={styles.drawerInfoLabel}>Batch Year</Text>
                        <Text style={styles.drawerInfoValue}>{info.year || 'N/A'}</Text>
                    </View>
                    <View style={styles.drawerInfoItem}>
                        <Text style={styles.drawerInfoLabel}>Program</Text>
                        <Text style={styles.drawerInfoValue}>{info.program || 'N/A'}</Text>
                    </View>
                    <View style={styles.drawerInfoItem}>
                        <Text style={styles.drawerInfoLabel}>Branch Code</Text>
                        <Text style={styles.drawerInfoValue}>{info.branchCode || 'N/A'}</Text>
                    </View>
                    <View style={styles.drawerInfoItem}>
                        <Text style={styles.drawerInfoLabel}>Roll / Reg #</Text>
                        <Text style={styles.drawerInfoValue}>{info.regNumber || 'N/A'}</Text>
                    </View>
                </View>

                {/* Drawer Actions */}
                <View style={styles.drawerActions}>
                    <TouchableOpacity style={styles.drawerActionBtn} onPress={() => { closeDrawer(); navigation.navigate('RoleSelection'); }} activeOpacity={0.8}>
                        <Text style={styles.drawerActionText}>🔄  Switch to Teacher</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.drawerLogoutBtn} onPress={handleLogout} activeOpacity={0.8}>
                        <Text style={styles.drawerLogoutText}>🚪  Sign Out</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },

    // Main Content
    mainContent: { flex: 1, paddingTop: 60 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 40 },
    hamburgerBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    hamburgerIcon: { fontSize: 22, color: '#f1f5f9' },
    topBarTitle: { fontSize: 18, fontWeight: '700', color: '#f8fafc' },

    welcomeSection: { paddingHorizontal: 24, marginBottom: 40 },
    welcomeText: { fontSize: 16, color: '#94a3b8', marginBottom: 4 },
    welcomeName: { fontSize: 28, fontWeight: '800', color: '#f8fafc' },

    // Scan Button
    scanBtn: { marginHorizontal: 24, backgroundColor: '#1e293b', padding: 32, borderRadius: 28, borderWidth: 2, borderColor: '#22c55e', alignItems: 'center', shadowColor: '#22c55e', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8, marginBottom: 16 },
    scanIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(34, 197, 94, 0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    scanIcon: { fontSize: 36 },
    scanTitle: { fontSize: 22, fontWeight: '800', color: '#22c55e', marginBottom: 8 },
    scanDesc: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 22, paddingHorizontal: 8 },

    galleryBtn: { marginHorizontal: 24, backgroundColor: '#1e293b', paddingVertical: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    galleryBtnText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },

    // Overlay
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 10 },

    // Drawer
    drawer: { position: 'absolute', top: 0, left: 0, bottom: 0, width: DRAWER_WIDTH, backgroundColor: '#1e293b', zIndex: 20, borderRightWidth: 1, borderRightColor: '#334155', shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 20 },

    drawerProfile: { paddingTop: 70, paddingBottom: 24, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#334155', alignItems: 'center' },
    avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', marginBottom: 14, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
    avatarText: { color: '#ffffff', fontSize: 32, fontWeight: '800' },
    drawerName: { fontSize: 20, fontWeight: '800', color: '#f8fafc', marginBottom: 4 },
    drawerEmail: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },

    drawerBody: { padding: 24, gap: 4 },
    drawerInfoItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(51, 65, 85, 0.5)' },
    drawerInfoLabel: { color: '#64748b', fontSize: 13, fontWeight: '600' },
    drawerInfoValue: { color: '#f1f5f9', fontSize: 14, fontWeight: '700' },

    drawerActions: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, gap: 12, borderTopWidth: 1, borderTopColor: '#334155' },
    drawerActionBtn: { backgroundColor: '#0f172a', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    drawerActionText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
    drawerLogoutBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    drawerLogoutText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
});
