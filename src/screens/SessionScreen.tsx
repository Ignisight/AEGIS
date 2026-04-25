import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Dimensions,
    ScrollView,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { stopSession } from '../api';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const QR_SIZE = Math.min(SCREEN_WIDTH - 64, 320);

interface SessionScreenProps {
    navigation: any;
    route: any;
}

export default function SessionScreen({ navigation, route }: SessionScreenProps) {
    const { sessionName, formUrl, sessionDurationMs, joinWindowMs } = route.params;

    // Fall back values if not provided
    const DURATION_MS: number = sessionDurationMs ?? 60 * 60 * 1000;
    const JOIN_WINDOW_MS: number = joinWindowMs ?? 10 * 60 * 1000;

    const [timeLeft, setTimeLeft] = useState(DURATION_MS);
    const [joinTimeLeft, setJoinTimeLeft] = useState(JOIN_WINDOW_MS);
    const [isActive, setIsActive] = useState(true);
    const [isJoinActive, setIsJoinActive] = useState(true);
    const [closing, setClosing] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const viewShotRef = useRef<any>(null);

    // Keep screen awake
    useEffect(() => {
        activateKeepAwakeAsync('session');
        return () => { deactivateKeepAwake('session'); };
    }, []);

    // Countdown timer (Absolute Time)
    useEffect(() => {
        if (!isActive) return;

        const startTime = Date.now();
        const endTime = startTime + DURATION_MS;
        const joinEndTime = startTime + JOIN_WINDOW_MS;

        const tick = () => {
            const now = Date.now();
            
            // Join Window Countdown (Now at Top)
            const joinRemaining = joinEndTime - now;
            if (joinRemaining <= 0) {
                setJoinTimeLeft(0);
                setIsJoinActive(false);
                // Auto-navigate to Responses when QR expires
                navigation.replace('Responses', { 
                    sessionId: route.params.sessionId, 
                    sessionName: route.params.sessionName,
                    sessionDurationMs: DURATION_MS,
                    createdAt: startTime // Pass creation time for timer in Responses
                });
            } else {
                setJoinTimeLeft(joinRemaining);
            }

            // Session Countdown (Now at Bottom)
            const remaining = endTime - now;
            if (remaining <= 0) {
                setTimeLeft(0);
                handleTerminate(true);
                return;
            }
            setTimeLeft(remaining);
        };

        tick();
        intervalRef.current = setInterval(tick, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isActive]);

    const handleTerminate = useCallback(async (auto = false) => {
        if (!isActive && !auto) return;

        setClosing(true);
        setIsActive(false);
        if (intervalRef.current) clearInterval(intervalRef.current);

        try {
            await stopSession(route.params.sessionId);
            Alert.alert(
                auto ? 'Time Up!' : 'Session Terminated',
                auto
                    ? 'The session duration has ended. The form is now closed.'
                    : 'Attendance session has been closed.',
                [{ text: 'OK' }]
            );
        } catch (err: any) {
            Alert.alert('Warning', 'Session may not have closed properly: ' + err.message);
        } finally {
            setClosing(false);
        }
    }, [isActive]);

    const formatTime = (ms: number) => {
        const totalSec = Math.max(0, Math.floor(ms / 1000));
        const hrs = Math.floor(totalSec / 3600);
        const min = Math.floor((totalSec % 3600) / 60);
        const sec = totalSec % 60;
        if (hrs > 0) {
            return `${hrs.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
        }
        return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    const getTimerColor = () => {
        const thresholdLow = Math.min(60000, DURATION_MS * 0.1);
        const thresholdMid = Math.min(180000, DURATION_MS * 0.3);
        if (timeLeft <= thresholdLow) return '#ef4444';
        if (timeLeft <= thresholdMid) return '#f59e0b';
        return '#22c55e';
    };

    const viewResponses = () => {
        navigation.replace('Responses', {
            sessionId: route.params.sessionId,
            sessionName,
            sessionDurationMs: DURATION_MS,
            createdAt: route.params.createdAt || Date.now()
        });
    };

    const goBack = () => {
        if (isActive) {
            Alert.alert(
                'Leave Running or Terminate?',
                'You can leave this session running in the background and start another one.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Leave Running', style: 'default', onPress: () => {
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            } else {
                                navigation.navigate('Home');
                            }
                        }
                    },
                    {
                        text: 'Terminate', style: 'destructive', onPress: async () => {
                            await handleTerminate();
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            } else {
                                navigation.navigate('Home');
                            }
                        }
                    },
                ]
            );
        } else {
            if (navigation.canGoBack()) {
                navigation.goBack();
            } else {
                navigation.navigate('Home');
            }
        }
    };

    const handleShareQR = async () => {
        try {
            if (!viewShotRef.current) return;
            const uri = await viewShotRef.current.capture();
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, { dialogTitle: 'Share Session QR Code' });
            } else {
                Alert.alert('Sharing Unavailable', 'Your device does not support sharing right now.');
            }
        } catch (error: any) {
            Alert.alert('Error sharing', error.message);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <View style={[styles.statusBadge, isActive ? styles.badgeActive : styles.badgeClosed]}>
                    <Text style={[styles.statusText, !isActive && { color: '#ef4444' }]}>
                        {isActive ? '● LIVE' : '● CLOSED'}
                    </Text>
                </View>
            </View>

            {/* Session Info */}
            <Text style={styles.sessionLabel}>Session</Text>
            <Text style={styles.sessionName}>{sessionName}</Text>

            {/* Top Timer (Now QR Window) */}
            <View style={styles.timerContainer}>
                <Text style={[styles.timer, { color: isJoinActive ? '#4ade80' : '#94a3b8' }]}>
                    {formatTime(joinTimeLeft)}
                </Text>
                <Text style={styles.timerLabel}>
                    {isJoinActive ? 'QR Join Window' : 'Join Window Closed'}
                </Text>
            </View>

            {/* QR Code */}
            <View style={styles.qrContainer}>
                {isActive && isJoinActive ? (
                    <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }}>
                        <View style={styles.qrWrapper}>
                            <QRCode
                                value={formUrl}
                                size={QR_SIZE}
                                backgroundColor="#ffffff"
                                color="#0f172a"
                            />
                        </View>
                    </ViewShot>
                ) : (
                    <View style={[styles.qrClosed, !isActive && { borderColor: '#ef4444' }]}>
                        <Text style={styles.qrClosedIcon}>{!isActive ? '⏹' : '🚫'}</Text>
                        <Text style={[styles.qrClosedText, !isActive && { color: '#ef4444' }]}>
                            {!isActive ? 'Session Ended' : 'Join Window Closed'}
                        </Text>
                        {isActive && <Text style={styles.qrClosedSub}>No more new students can join</Text>}
                    </View>
                )}
            </View>

            {isActive && (
                <View style={styles.joinTimerBox}>
                    <Text style={styles.joinTimerLabel}>Session Remaining:</Text>
                    <Text style={styles.joinTimerValue}>{formatTime(timeLeft)}</Text>
                </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
                {isActive && (
                    <>
                        <TouchableOpacity
                            style={styles.shareBtn}
                            onPress={handleShareQR}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.shareBtnText}>🔗  Share QR Code</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.terminateBtn}
                            onPress={() => handleTerminate(false)}
                            disabled={closing}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.terminateBtnText}>
                                {closing ? '⏳ Closing...' : '⏹  Terminate Session'}
                            </Text>
                        </TouchableOpacity>
                    </>
                )}

                <TouchableOpacity style={styles.actionBtn} onPress={viewResponses} activeOpacity={0.8}>
                    <Text style={styles.actionBtnText}>📊  View Responses</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    scrollContent: { padding: 20, paddingTop: 56, paddingBottom: 40, alignItems: 'center' },
    header: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    backBtn: { padding: 8 },
    backText: { color: '#94a3b8', fontSize: 16, fontWeight: '600' },
    statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
    badgeActive: { backgroundColor: '#052e16' },
    badgeClosed: { backgroundColor: '#450a0a' },
    statusText: { color: '#22c55e', fontWeight: '700', fontSize: 13 },
    sessionLabel: { fontSize: 13, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    sessionName: { fontSize: 20, fontWeight: '700', color: '#f1f5f9', textAlign: 'center', marginBottom: 20 },
    timerContainer: { alignItems: 'center', marginBottom: 24 },
    timer: { fontSize: 56, fontWeight: '800', fontVariant: ['tabular-nums'] },
    timerLabel: { fontSize: 13, color: '#64748b', marginTop: 4 },
    qrContainer: { marginBottom: 28 },
    qrWrapper: { padding: 16, backgroundColor: '#ffffff', borderRadius: 20, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 },
    qrClosed: { width: QR_SIZE + 32, height: QR_SIZE + 32, backgroundColor: '#1e293b', borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#f59e0b' },
    qrClosedIcon: { fontSize: 48, marginBottom: 12 },
    qrClosedText: { fontSize: 18, color: '#f59e0b', fontWeight: '700' },
    qrClosedSub: { fontSize: 13, color: '#64748b', marginTop: 8 },
    joinTimerBox: { backgroundColor: '#052e16', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#22c55e', marginBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 8 },
    joinTimerLabel: { color: '#4ade80', fontSize: 13, fontWeight: '600' },
    joinTimerValue: { color: '#ffffff', fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
    actions: { width: '100%', gap: 12 },
    shareBtn: { width: '100%', backgroundColor: '#6366f1', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginBottom: 4 },
    shareBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
    terminateBtn: { width: '100%', backgroundColor: '#dc2626', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
    terminateBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
    actionBtn: { width: '100%', backgroundColor: '#1e293b', paddingVertical: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    actionBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
    actionBtnOutline: { width: '100%', backgroundColor: 'transparent', paddingVertical: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#334155' },
    actionBtnOutlineText: { color: '#94a3b8', fontSize: 16, fontWeight: '600' },
});
