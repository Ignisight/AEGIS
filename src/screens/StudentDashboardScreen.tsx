import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated, Dimensions, TouchableWithoutFeedback, ScrollView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStudentCourses } from '../api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.78;

interface StudentData {
    name?: string;
    displayName?: string;
    email: string;
    deviceId: string;
}

interface CourseAttendance {
    courseId: string;
    courseName: string;
    semester: string;
    department: string;
    totalSessions: number;
    attended: number;
    percentage: number | null;
}

export default function StudentDashboardScreen({ navigation }: any) {
    const [student, setStudent]           = useState<StudentData | null>(null);
    const [drawerOpen, setDrawerOpen]     = useState(false);
    const [courses, setCourses]           = useState<CourseAttendance[]>([]);
    const [coursesLoading, setCoursesLoading] = useState(false);
    const [coursesError, setCoursesError] = useState('');
    const drawerAnim  = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const overlayAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => { loadStudent(); }, []);

    const loadStudent = async () => {
        try {
            const saved = await AsyncStorage.getItem('student_user');
            if (saved) {
                const parsed = JSON.parse(saved);
                setStudent(parsed);
                const normalizedEmail = (parsed.email || '').toLowerCase().trim();
                fetchCourses(normalizedEmail);
            } else {
                navigation.replace('StudentLogin');
            }
        } catch {
            navigation.replace('StudentLogin');
        }
    };

    const fetchCourses = useCallback(async (email: string) => {
        setCoursesLoading(true);
        setCoursesError('');
        try {
            const json = await getStudentCourses(email);
            if (json.success) {
                setCourses(json.courses || []);
            } else {
                setCoursesError(json.error || 'Could not load courses.');
            }
        } catch {
            setCoursesError('Network error loading courses.');
        } finally {
            setCoursesLoading(false);
        }
    }, []);

    const openDrawer = () => {
        setDrawerOpen(true);
        Animated.parallel([
            Animated.spring(drawerAnim,  { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
            Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();
    };

    const closeDrawer = () => {
        Animated.parallel([
            Animated.spring(drawerAnim,  { toValue: -DRAWER_WIDTH, useNativeDriver: true, tension: 65, friction: 11 }),
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

    const emailPrefix = student?.email?.split('@')[0] || '';
    const displayName = (student?.name && student.name.trim())
        || (student?.displayName && student.displayName.trim())
        || emailPrefix
        || '';
    const avatarLetter = ((student?.name || student?.displayName || '').trim().charAt(0) || emailPrefix.charAt(0) || 'S').toUpperCase();

    const getStudentInfo = () => {
        if (!student) return { regNo: '', year: '', program: '', branchCode: '', regNumber: '' };
        const prefix    = student.email.split('@')[0].toUpperCase();
        const yearMatch = prefix.match(/^(\d{4})/);
        const year      = yearMatch ? yearMatch[1] : '';
        const afterYear = prefix.slice(year.length);
        let program = '';
        let afterProgram = afterYear;
        if (afterYear.startsWith('UG'))      { program = 'Undergraduate (UG)'; afterProgram = afterYear.slice(2); }
        else if (afterYear.startsWith('PG')) { program = 'Postgraduate (PG)';  afterProgram = afterYear.slice(2); }
        const branchRegMatch = afterProgram.match(/^([A-Z]+)(\d+)$/);
        const branchCode = branchRegMatch ? branchRegMatch[1] : afterProgram.replace(/\d+/g, '');
        const regNumber  = branchRegMatch ? branchRegMatch[2] : afterProgram.replace(/[A-Z]+/gi, '');
        return { regNo: prefix, year, program, branchCode, regNumber };
    };

    const getPercentageColor = (pct: number | null) => {
        if (pct === null) return '#64748b';
        if (pct >= 80) return '#22c55e';  // 80–100 → green
        if (pct >= 75) return '#f59e0b';  // 75–79  → yellow (safe but just above threshold)
        return '#ef4444';                  // <75    → red (below required threshold)
    };

    if (!student) return <View style={styles.container} />;
    const info = getStudentInfo();

    return (
        <View style={styles.container}>
            {/* ===== MAIN CONTENT ===== */}
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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
                    <Text style={styles.welcomeName}>{displayName} 👋</Text>
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

                {/* ===== MY COURSES & ATTENDANCE ===== */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>📊 My Attendance</Text>
                    <TouchableOpacity
                        onPress={() => student && fetchCourses(student.email.toLowerCase().trim())}
                        style={styles.refreshBtn}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.refreshBtnText}>↺ Refresh</Text>
                    </TouchableOpacity>
                </View>

                {coursesLoading ? (
                    <View style={styles.courseCenterBox}>
                        <ActivityIndicator size="large" color="#6366f1" />
                        <Text style={styles.courseHint}>Loading attendance data…</Text>
                    </View>
                ) : coursesError ? (
                    <View style={styles.courseCenterBox}>
                        <Text style={styles.courseErrorText}>⚠️ {coursesError}</Text>
                    </View>
                ) : courses.length === 0 ? (
                    <View style={styles.courseCenterBox}>
                        <Text style={styles.courseEmptyIcon}>📭</Text>
                        <Text style={styles.courseEmptyText}>No enrolled courses found.</Text>
                        <Text style={styles.courseHint}>Contact your admin to get enrolled in courses.</Text>
                    </View>
                ) : (
                    <View style={styles.coursesList}>
                        {courses.map(c => {
                            const pct = c.percentage;
                            const color = getPercentageColor(pct);
                            const warn = pct !== null && pct < 75;
                            return (
                                <View key={c.courseId} style={[styles.courseCard, warn && styles.courseCardWarn]}>
                                    <View style={styles.courseCardLeft}>
                                        <View style={styles.courseHeaderRow}>
                                            <Text style={styles.courseCode}>{c.courseId}</Text>
                                            {c.totalSessions > 0 && (
                                                <View style={styles.sessionBadge}>
                                                    <Text style={styles.sessionBadgeText}>{c.totalSessions} Sessions</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.courseNameText} numberOfLines={2}>{c.courseName}</Text>
                                        
                                        <View style={styles.statsRow}>
                                            <View style={styles.statItem}>
                                                <Text style={styles.statLabel}>Attended</Text>
                                                <Text style={styles.statValue}>{c.attended}</Text>
                                            </View>
                                            <View style={styles.statDivider} />
                                            <View style={styles.statItem}>
                                                <Text style={styles.statLabel}>Requirement</Text>
                                                <Text style={styles.statValue}>75%</Text>
                                            </View>
                                        </View>
                                    </View>
                                    
                                    <View style={styles.courseCardRight}>
                                        <View style={[styles.percentageCircle, { borderColor: color + '30' }]}>
                                            <Text style={[styles.percentageNumber, { color }]}>
                                                {pct !== null ? `${pct}%` : '—'}
                                            </Text>
                                            <Text style={styles.percentageLabel}>Attendance</Text>
                                        </View>
                                        {warn && <View style={styles.miniWarn}><Text style={styles.miniWarnText}>⚠️ Low</Text></View>}
                                    </View>
                                </View>
                            );
                        })}
                        {courses.some(c => c.percentage !== null && c.percentage < 75) && (
                            <View style={styles.warnBanner}>
                                <Text style={styles.warnBannerText}>⚠️ Courses below 75% are highlighted in red. Contact your teacher if needed.</Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* ===== DRAWER OVERLAY ===== */}
            {drawerOpen && (
                <TouchableWithoutFeedback onPress={closeDrawer}>
                    <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} />
                </TouchableWithoutFeedback>
            )}

            {/* ===== DRAWER ===== */}
            <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
                <View style={styles.drawerProfile}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{avatarLetter}</Text>
                    </View>
                    <Text style={styles.drawerName}>{displayName}</Text>
                    <Text style={styles.drawerEmail}>{student.email}</Text>
                </View>

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

                <View style={styles.drawerActions}>
                    <TouchableOpacity
                        style={styles.drawerActionBtn}
                        onPress={() => { closeDrawer(); navigation.navigate('RoleSelection'); }}
                        activeOpacity={0.8}
                    >
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
    scrollContent: { paddingTop: 60, paddingBottom: 40 },

    topBar:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 40 },
    hamburgerBtn:  { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    hamburgerIcon: { fontSize: 22, color: '#f1f5f9' },
    topBarTitle:   { fontSize: 18, fontWeight: '700', color: '#f8fafc' },

    welcomeSection: { paddingHorizontal: 24, marginBottom: 28 },
    welcomeText:    { fontSize: 16, color: '#94a3b8', marginBottom: 4 },
    welcomeName:    { fontSize: 28, fontWeight: '800', color: '#f8fafc' },

    scanBtn:        { marginHorizontal: 24, backgroundColor: '#1e293b', padding: 32, borderRadius: 28, borderWidth: 2, borderColor: '#22c55e', alignItems: 'center', shadowColor: '#22c55e', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8, marginBottom: 12 },
    scanIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(34,197,94,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    scanIcon:       { fontSize: 36 },
    scanTitle:      { fontSize: 22, fontWeight: '800', color: '#22c55e', marginBottom: 8 },
    scanDesc:       { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 22, paddingHorizontal: 8 },

    galleryBtn:     { marginHorizontal: 24, backgroundColor: '#1e293b', paddingVertical: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#334155', marginBottom: 32 },
    galleryBtnText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },

    sectionHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 14 },
    sectionTitle:   { fontSize: 17, fontWeight: '800', color: '#f1f5f9' },
    refreshBtn:     { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#1e293b', borderRadius: 10, borderWidth: 1, borderColor: '#334155' },
    refreshBtnText: { color: '#6366f1', fontSize: 13, fontWeight: '700' },

    courseCenterBox: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 24, gap: 8 },
    courseHint:      { color: '#475569', fontSize: 13, textAlign: 'center' },
    courseErrorText: { color: '#f87171', fontSize: 14, textAlign: 'center' },
    courseEmptyIcon: { fontSize: 40 },
    courseEmptyText: { fontSize: 15, fontWeight: '700', color: '#94a3b8' },

    coursesList:        { paddingHorizontal: 24, gap: 12 },
    courseCard:         { backgroundColor: '#1e293b', borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#334155', marginBottom: 4 },
    courseCardWarn:     { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: '#1e293b' },
    courseCardLeft:     { flex: 1, gap: 8 },
    courseCardRight:    { alignItems: 'center', marginLeft: 16 },
    
    courseHeaderRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sessionBadge:       { backgroundColor: '#334155', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    sessionBadgeText:   { color: '#94a3b8', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },

    courseCode:         { color: '#6366f1', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
    courseNameText:     { color: '#f1f5f9', fontSize: 16, fontWeight: '700', lineHeight: 22 },
    
    statsRow:           { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 12 },
    statItem:           { gap: 2 },
    statLabel:          { color: '#64748b', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
    statValue:          { color: '#cbd5e1', fontSize: 13, fontWeight: '800' },
    statDivider:        { width: 1, height: 16, backgroundColor: '#334155' },

    percentageCircle:   { width: 70, height: 70, borderRadius: 35, borderWidth: 3, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
    percentageNumber:   { fontSize: 18, fontWeight: '900' },
    percentageLabel:    { fontSize: 8, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginTop: -2 },

    miniWarn:           { backgroundColor: '#ef4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: -10 },
    miniWarnText:       { color: 'white', fontSize: 8, fontWeight: '900' },

    warnBanner:     { marginTop: 8, padding: 14, backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
    warnBannerText: { color: '#fca5a5', fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 18 },

    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10 },
    drawer:  { position: 'absolute', top: 0, left: 0, bottom: 0, width: DRAWER_WIDTH, backgroundColor: '#1e293b', zIndex: 20, borderRightWidth: 1, borderRightColor: '#334155', shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 20 },

    drawerProfile: { paddingTop: 70, paddingBottom: 24, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#334155', alignItems: 'center' },
    avatarCircle:  { width: 72, height: 72, borderRadius: 36, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', marginBottom: 14, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
    avatarText:    { color: '#ffffff', fontSize: 32, fontWeight: '800' },
    drawerName:    { fontSize: 20, fontWeight: '800', color: '#f8fafc', marginBottom: 4, textAlign: 'center' },
    drawerEmail:   { fontSize: 13, color: '#94a3b8', fontWeight: '500' },

    drawerBody:      { padding: 24, gap: 4 },
    drawerInfoItem:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(51,65,85,0.5)' },
    drawerInfoLabel: { color: '#64748b', fontSize: 13, fontWeight: '600' },
    drawerInfoValue: { color: '#f1f5f9', fontSize: 14, fontWeight: '700' },

    drawerActions:    { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, gap: 12, borderTopWidth: 1, borderTopColor: '#334155' },
    drawerActionBtn:  { backgroundColor: '#0f172a', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    drawerActionText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
    drawerLogoutBtn:  { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    drawerLogoutText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
});
