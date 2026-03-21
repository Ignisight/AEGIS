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
import { SESSION_DURATION_MS } from '../config';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const QR_SIZE = Math.min(SCREEN_WIDTH - 64, 320);

interface SessionScreenProps {
    navigation: any;
    route: any;
}

export default function SessionScreen({ navigation, route }: SessionScreenProps) {
    const { sessionName, formUrl } = route.params;

    const [timeLeft, setTimeLeft] = useState(SESSION_DURATION_MS);
    const [isActive, setIsActive] = useState(true);
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

        const startTime = route.params.sessionId || Date.now();
        const endTime = startTime + SESSION_DURATION_MS;

        const tick = () => {
            const now = Date.now();
            const remaining = endTime - now;

            if (remaining <= 0) {
                setTimeLeft(0);
                handleTerminate(true);
                return;
            }
            setTimeLeft(remaining);
        };

        // Initial tick
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
                    ? 'The 10-minute session has ended. Form is now closed.'
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
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    const getTimerColor = () => {
        if (timeLeft <= 60000) return '#ef4444';
        if (timeLeft <= 180000) return '#f59e0b';
        return '#22c55e';
    };

    const viewResponses = () => {
        navigation.navigate('Responses', { 
            sessionId: route.params.sessionId, 
            sessionName 
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
            // Delay slightly to ensure render
            const uri = await viewShotRef.current.capture();
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    dialogTitle: 'Share Session QR Code',
                });
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

            {/* Timer */}
            <View style={styles.timerContainer}>
                <Text style={[styles.timer, { color: getTimerColor() }]}>
                    {formatTime(timeLeft)}
                </Text>
                <Text style={styles.timerLabel}>
                    {isActive ? 'Time Remaining' : 'Session Ended'}
                </Text>
            </View>

            {/* QR Code */}
            <View style={styles.qrContainer}>
                {isActive ? (
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
                    <View style={styles.qrClosed}>
                        <Text style={styles.qrClosedIcon}>🚫</Text>
                        <Text style={styles.qrClosedText}>Session Closed</Text>
                    </View>
                )}
            </View>

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
    qrClosed: { width: QR_SIZE + 32, height: QR_SIZE + 32, backgroundColor: '#1e293b', borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#ef4444' },
    qrClosedIcon: { fontSize: 48, marginBottom: 12 },
    qrClosedText: { fontSize: 18, color: '#ef4444', fontWeight: '700' },
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
