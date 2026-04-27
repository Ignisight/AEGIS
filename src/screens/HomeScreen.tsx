import React, { useState, useRef, useEffect, useCallback } from 'react';
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
    FlatList,
    Modal,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { startSession, getServerUrl, clearUser, getTeacherCourses } from '../api';
import { APP_SECRET_HEADER } from '../config';
import * as Location from 'expo-location';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.82;

interface Course {
    courseId: string;
    courseName: string;
    semester: string;
}

interface HomeScreenProps {
    navigation: any;
    route: any;
}

// ── Utility: parse "HH.MM" → milliseconds ─────────────────────────────────
function parseDurationToMs(input: string): number | null {
    const trimmed = input.trim();
    const match = trimmed.match(/^(\d{1,2})\.(\d{2})$/);
    if (!match) return null;
    const hours = parseInt(match[1], 10);
    const mins  = parseInt(match[2], 10);
    if (mins > 59) return null;
    const totalMs = (hours * 60 + mins) * 60 * 1000;
    if (totalMs <= 0) return null;
    return totalMs;
}

export default function HomeScreen({ navigation, route }: HomeScreenProps) {
    const { userName, userEmail, userCollege, userDepartment, userAllowedDomain } = route.params || {};

    // Course state
    const [courses, setCourses]             = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [coursesLoading, setCoursesLoading] = useState(true);
    const [coursesError, setCoursesError]   = useState('');

    // Duration modal state
    const [durationModalVisible, setDurationModalVisible] = useState(false);
    const [durationInput, setDurationInput]               = useState('01.00');
    const [durationError, setDurationError]               = useState('');

    // Session state
    const [loading, setLoading] = useState(false);

    // Drawer state
    const [drawerOpen, setDrawerOpen] = useState(false);
    const drawerAnim  = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const overlayAnim = useRef(new Animated.Value(0)).current;

    // ── Course fetching ───────────────────────────────────────────────────
    const fetchCourses = useCallback(async () => {
        setCoursesLoading(true);
        setCoursesError('');
        setSelectedCourse(null);
        try {
            const json = await getTeacherCourses(userEmail || '');
            if (!json.success) {
                setCoursesError(json.error || 'Could not load courses.');
            } else {
                setCourses(json.courses || []);
            }
        } catch {
            setCoursesError('Could not load courses. Check your connection.');
        } finally {
            setCoursesLoading(false);
        }
    }, [userEmail]);

    useEffect(() => { fetchCourses(); }, [fetchCourses]);

    // ── Drawer helpers ────────────────────────────────────────────────────
    const openDrawer = () => {
        setDrawerOpen(true);
        Animated.parallel([
            Animated.spring(drawerAnim,  { toValue: 0,            useNativeDriver: true, damping: 20 }),
            Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();
    };

    const closeDrawer = () => {
        Animated.parallel([
            Animated.spring(drawerAnim,  { toValue: -DRAWER_WIDTH, useNativeDriver: true, damping: 20 }),
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
            userName, userEmail, userCollege, userDepartment, userAllowedDomain,
        }), 300);
    };

    // ── Duration modal ────────────────────────────────────────────────────
    const openDurationModal = () => {
        if (!selectedCourse) {
            Alert.alert('Required', 'Please select a course first.');
            return;
        }
        setDurationInput('01.00');
        setDurationError('');
        setDurationModalVisible(true);
    };

    const confirmDurationAndStart = async () => {
        const ms = parseDurationToMs(durationInput);
        if (!ms) {
            setDurationError('Enter a valid duration like 01.00 (HH.MM), e.g. 00.30 for 30 min.');
            return;
        }
        if (ms < 10 * 60 * 1000) {
            setDurationError('Session duration must be at least 10 minutes (00.10).');
            return;
        }
        setDurationModalVisible(false);
        await startAttendanceSession(ms);
    };

    // ── Start session (called after duration is confirmed) ────────────────
    const startAttendanceSession = async (durationMs: number) => {
        if (!selectedCourse) return;

        const sessionLabel = `${selectedCourse.courseId} — ${selectedCourse.courseName}`;
        setLoading(true);
        try {
            let latitude: number | undefined;
            let longitude: number | undefined;

            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const locationPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    const timeoutPromise  = new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error('GPS timeout')), 5000)
                    );
                    const location: any = await Promise.race([locationPromise, timeoutPromise]);
                    latitude  = location.coords.latitude;
                    longitude = location.coords.longitude;
                }
            } catch (locErr) {
                console.log('GPS skipped:', locErr);
            }

            try {
                const durationMins = Math.floor(durationMs / 60000);
                const joinWindowMins = 10; // Default join window
                const result = await startSession(
                    sessionLabel, 
                    latitude, 
                    longitude, 
                    userEmail,
                    durationMins,
                    80, // radius
                    selectedCourse.courseId,
                    joinWindowMins
                );
                if (result.error) { Alert.alert('Error', result.error); return; }
                if (result.success) {
                    navigation.navigate('Session', {
                        sessionName:       sessionLabel,
                        formUrl:           result.formUrl,
                        sessionId:         result.sessionId,
                        sessionDurationMs: durationMs,
                        joinWindowMs:      joinWindowMins * 60 * 1000,
                    });
                    setSelectedCourse(null);
                }
            } catch {
                Alert.alert('Connection Error', 'Could not reach the server. Check Settings → Server URL.');
            }
        } finally {
            setLoading(false);
        }
    };

    // ── Course card renderer ──────────────────────────────────────────────
    const renderCourseCard = ({ item }: { item: Course }) => {
        const isSelected = selectedCourse?.courseId === item.courseId;
        return (
            <TouchableOpacity
                style={[styles.courseCard, isSelected && styles.courseCardSelected]}
                onPress={() => setSelectedCourse(isSelected ? null : item)}
                activeOpacity={0.75}
            >
                <View style={styles.courseCardLeft}>
                    <Text style={styles.courseCode}>{item.courseId}</Text>
                    <Text style={styles.courseName} numberOfLines={2}>{item.courseName}</Text>
                </View>
                <View style={styles.semesterBadge}>
                    <Text style={styles.semesterText}>Sem {item.semester}</Text>
                </View>
                {isSelected && (
                    <View style={styles.selectedTick}>
                        <Text style={styles.selectedTickText}>✓</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    // ── Course section content ────────────────────────────────────────────
    const renderCourseSection = () => {
        if (coursesLoading) {
            return (
                <View style={styles.courseCenterBox}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text style={styles.courseHintText}>Loading your courses…</Text>
                </View>
            );
        }
        if (coursesError) {
            return (
                <View style={styles.courseCenterBox}>
                    <Text style={styles.courseErrorIcon}>⚠️</Text>
                    <Text style={styles.courseErrorText}>{coursesError}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={fetchCourses}>
                        <Text style={styles.retryBtnText}>↺  Retry</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        if (courses.length === 0) {
            return (
                <View style={styles.courseCenterBox}>
                    <Text style={styles.courseErrorIcon}>📭</Text>
                    <Text style={styles.courseEmptyText}>No courses assigned.</Text>
                    <Text style={styles.courseHintText}>Contact your admin to get courses assigned.</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={fetchCourses}>
                        <Text style={styles.retryBtnText}>↺  Refresh</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        return (
            <FlatList
                data={courses}
                keyExtractor={(item) => item.courseId}
                renderItem={renderCourseCard}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                contentContainerStyle={{ paddingTop: 4 }}
            />
        );
    };

    // ── Render ────────────────────────────────────────────────────────────
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
                        Select a course below, then tap Start. You'll set the session duration before it begins.
                    </Text>

                    {/* Course Picker */}
                    <View style={styles.courseSection}>
                        <Text style={styles.label}>Select Course</Text>
                        {renderCourseSection()}
                    </View>

                    <TouchableOpacity
                        style={[styles.startBtn, (!selectedCourse || loading) && styles.startBtnDisabled]}
                        onPress={openDurationModal}
                        disabled={!selectedCourse || loading}
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
                        <Text style={styles.infoDesc}>6 months of records</Text>
                    </TouchableOpacity>
                    <View style={styles.infoCard}>
                        <Text style={styles.infoIcon}>☁️</Text>
                        <Text style={styles.infoTitle}>Cloud Server</Text>
                        <Text style={styles.infoDesc}>Always available</Text>
                    </View>
                </View>
            </ScrollView>

            {/* ── Duration Modal ──────────────────────────────────────────── */}
            <Modal
                visible={durationModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setDurationModalVisible(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>⏱ Set Session Duration</Text>
                        <Text style={styles.modalSubtitle}>
                            Format: HH.MM — e.g. <Text style={{ color: '#818cf8', fontWeight: '700' }}>01.30</Text> for 1 hour 30 min
                        </Text>

                        <TextInput
                            style={styles.modalInput}
                            value={durationInput}
                            onChangeText={(t) => { setDurationInput(t); setDurationError(''); }}
                            keyboardType="decimal-pad"
                            placeholder="01.00"
                            placeholderTextColor="#475569"
                            maxLength={5}
                            autoFocus
                        />

                        {durationError !== '' && (
                            <Text style={styles.modalError}>{durationError}</Text>
                        )}

                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setDurationModalVisible(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalConfirmBtn}
                                onPress={confirmDurationAndStart}
                            >
                                <Text style={styles.modalConfirmText}>Start ▶</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

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

                            <TouchableOpacity style={styles.menuItem} onPress={openHistory}>
                                <Text style={styles.menuItemIcon}>📊</Text>
                                <View style={styles.menuItemContent}>
                                    <Text style={styles.menuItemTitle}>Session History</Text>
                                    <Text style={styles.menuItemDesc}>View 6 months of records</Text>
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

                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => { closeDrawer(); setTimeout(() => navigation.navigate('RoleSelection'), 300); }}
                            >
                                <Text style={styles.menuItemIcon}>🔄</Text>
                                <View style={styles.menuItemContent}>
                                    <Text style={styles.menuItemTitle}>Switch to Student</Text>
                                    <Text style={styles.menuItemDesc}>Scan QR as a student</Text>
                                </View>
                                <Text style={styles.menuItemArrow}>›</Text>
                            </TouchableOpacity>

                            <View style={styles.divider} />

                            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                                <Text style={styles.logoutText}>🚪  Logout</Text>
                            </TouchableOpacity>

                            <Text style={styles.versionText}>A.E.G.I.S — Automated Entry Geo-fenced Identification System</Text>
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
    menuIcon:     { fontSize: 22, color: '#f1f5f9' },
    greeting:     { fontSize: 22, fontWeight: '700', color: '#f1f5f9' },
    subGreeting:  { fontSize: 13, color: '#64748b', marginTop: 2 },

    card: {
        backgroundColor: '#1e293b', borderRadius: 20, padding: 28,
        alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#334155',
    },
    cardIcon:     { width: 64, height: 64, borderRadius: 32, backgroundColor: '#312e81', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    cardIconText: { fontSize: 28 },
    cardTitle:    { fontSize: 22, fontWeight: '700', color: '#f1f5f9', marginBottom: 8 },
    cardDesc:     { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20, marginBottom: 24 },

    courseSection: { width: '100%', marginBottom: 20 },
    label:         { fontSize: 14, fontWeight: '600', color: '#cbd5e1', marginBottom: 10 },

    courseCenterBox: { alignItems: 'center', paddingVertical: 20, gap: 10 },
    courseErrorIcon: { fontSize: 36 },
    courseErrorText: { fontSize: 14, color: '#ef4444', textAlign: 'center', lineHeight: 20 },
    courseEmptyText: { fontSize: 15, fontWeight: '600', color: '#94a3b8' },
    courseHintText:  { fontSize: 13, color: '#475569', textAlign: 'center' },

    retryBtn:     { marginTop: 6, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#1e3a5f', borderRadius: 10, borderWidth: 1, borderColor: '#3b82f6' },
    retryBtnText: { color: '#60a5fa', fontSize: 14, fontWeight: '700' },

    courseCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#0f172a', borderRadius: 14, padding: 16,
        borderWidth: 1.5, borderColor: '#334155', gap: 12,
    },
    courseCardSelected: { borderColor: '#6366f1', backgroundColor: '#1e1b4b' },
    courseCardLeft:     { flex: 1 },
    courseCode:         { fontSize: 15, fontWeight: '800', color: '#818cf8', marginBottom: 3 },
    courseName:         { fontSize: 13, color: '#94a3b8', lineHeight: 18 },
    semesterBadge:      { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#1e293b', borderRadius: 8, borderWidth: 1, borderColor: '#475569' },
    semesterText:       { fontSize: 11, fontWeight: '700', color: '#64748b' },
    selectedTick:       { width: 24, height: 24, borderRadius: 12, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center' },
    selectedTickText:   { color: '#fff', fontSize: 13, fontWeight: '800' },

    startBtn:         { width: '100%', backgroundColor: '#6366f1', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
    startBtnDisabled: { backgroundColor: '#3730a3', opacity: 0.5 },
    startBtnText:     { color: '#ffffff', fontSize: 17, fontWeight: '700' },
    loadingRow:       { flexDirection: 'row', alignItems: 'center' },

    infoRow:   { flexDirection: 'row', gap: 12 },
    infoCard:  { flex: 1, backgroundColor: '#1e293b', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    infoIcon:  { fontSize: 28, marginBottom: 8 },
    infoTitle: { fontSize: 14, fontWeight: '700', color: '#e2e8f0', marginBottom: 4 },
    infoDesc:  { fontSize: 11, color: '#64748b', textAlign: 'center' },

    // Duration Modal
    modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 32 },
    modalCard:     { width: '100%', backgroundColor: '#1e293b', borderRadius: 24, padding: 28, borderWidth: 1, borderColor: '#334155' },
    modalTitle:    { fontSize: 20, fontWeight: '800', color: '#f1f5f9', marginBottom: 8, textAlign: 'center' },
    modalSubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
    modalInput: {
        backgroundColor: '#0f172a', borderRadius: 14,
        paddingHorizontal: 20, paddingVertical: 16,
        fontSize: 28, fontWeight: '700', color: '#f1f5f9',
        borderWidth: 1.5, borderColor: '#334155',
        textAlign: 'center', letterSpacing: 4, marginBottom: 8,
    },
    modalError:       { color: '#ef4444', fontSize: 12, textAlign: 'center', marginBottom: 12 },
    modalBtnRow:      { flexDirection: 'row', gap: 12, marginTop: 8 },
    modalCancelBtn:   { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
    modalCancelText:  { color: '#94a3b8', fontSize: 15, fontWeight: '600' },
    modalConfirmBtn:  { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#6366f1' },
    modalConfirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },

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
    profileCard: {
        alignItems: 'center', paddingBottom: 20,
        backgroundColor: '#0f172a', borderRadius: 20, padding: 24,
        borderWidth: 1, borderColor: '#334155',
    },
    avatar:       { width: 72, height: 72, borderRadius: 36, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', marginBottom: 14, borderWidth: 3, borderColor: '#818cf8' },
    avatarText:   { fontSize: 28, fontWeight: '800', color: '#fff' },
    profileName:  { fontSize: 20, fontWeight: '700', color: '#f1f5f9' },
    profileEmail: { fontSize: 13, color: '#64748b', marginTop: 4 },
    profileMeta:  { marginTop: 14, gap: 8 },
    metaRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
    metaIcon:     { fontSize: 16 },
    metaText:     { fontSize: 14, color: '#94a3b8', fontWeight: '500' },
    divider:      { height: 1, backgroundColor: '#334155', marginVertical: 16 },
    menuItem:     { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 4 },
    menuItemIcon:    { fontSize: 24 },
    menuItemContent: { flex: 1 },
    menuItemTitle:   { fontSize: 16, fontWeight: '600', color: '#f1f5f9' },
    menuItemDesc:    { fontSize: 12, color: '#64748b', marginTop: 2 },
    menuItemArrow:   { fontSize: 24, color: '#475569', fontWeight: '300' },
    drawerSectionTitle: { fontSize: 14, fontWeight: '700', color: '#e2e8f0', marginBottom: 12 },
    drawerFieldGroup:   { marginBottom: 8 },
    drawerLabel:        { fontSize: 11, fontWeight: '600', color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' },
    drawerInput:        { backgroundColor: '#0f172a', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#f1f5f9', borderWidth: 1, borderColor: '#334155' },
    saveServerBtn:      { marginTop: 10, backgroundColor: '#6366f1', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    saveServerBtnText:  { color: '#fff', fontSize: 14, fontWeight: '700' },
    logoutBtn:    { backgroundColor: '#450a0a', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#dc2626' },
    logoutText:   { color: '#ef4444', fontSize: 16, fontWeight: '700' },
    versionText:  { textAlign: 'center', color: '#334155', fontSize: 12, marginTop: 20 },
});
