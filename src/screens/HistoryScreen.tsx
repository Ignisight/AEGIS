import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServerUrl } from '../api';
import { APP_SECRET_HEADER, APP_SECRET_KEY } from '../config';

interface HistoryScreenProps {
    navigation: any;
}

interface SessionItem {
    id: number;
    name: string;
    createdAt: string;
    stoppedAt: string | null;
    active: boolean;
    responseCount: number;
}

export default function HistoryScreen({ navigation }: HistoryScreenProps) {
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [actionLoading, setActionLoading] = useState(false);
    const [now, setNow] = useState(Date.now());
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const serverUrl = getServerUrl();
            const res = await fetch(`${serverUrl}/api/history`, { headers: APP_SECRET_HEADER });
            const data = await res.json();
            if (data.success) {
                setSessions(data.sessions);
            }
        } catch (err: any) {
            Alert.alert('Error', 'Could not fetch session history.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchHistory(); }, []);

    // Update elapsed time every second for active sessions
    useEffect(() => {
        const hasActive = sessions.some(s => s.active);
        if (hasActive) {
            timerRef.current = setInterval(() => setNow(Date.now()), 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [sessions]);

    const formatDateTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: '2-digit',
        }) + ' • ' + d.toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
        });
    };

    const formatDuration = (start: string, end: string | null, active: boolean) => {
        let endMs;
        if (end) {
            endMs = new Date(end).getTime();
        } else if (active) {
            endMs = now;
        } else {
            endMs = new Date(start).getTime() + 10 * 60 * 1000; // 10m fallback for legacy
        }

        let ms = endMs - new Date(start).getTime();

        // Cap the live active timer to EXACTLY 10 minutes if the user hasn't pulled to refresh yet
        if (active && ms > 10 * 60 * 1000) {
            ms = 10 * 60 * 1000;
        }

        const totalSec = Math.floor(ms / 1000);
        const hrs = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;
        if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
        if (mins > 0) return `${mins}m ${secs}s`;
        return `${secs}s`;
    };

    const stopSession = (item: SessionItem) => {
        Alert.alert(
            'Stop Session',
            `Stop "${item.name}"? Students will no longer be able to submit.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Stop', style: 'destructive', onPress: async () => {
                        setActionLoading(true);
                        try {
                            const serverUrl = getServerUrl();
                            await fetch(`${serverUrl}/api/sessions/${item.id}/stop`, { method: 'POST', headers: APP_SECRET_HEADER });
                            await fetchHistory();
                        } catch {
                            Alert.alert('Error', 'Failed to stop session.');
                        } finally {
                            setActionLoading(false);
                        }
                    }
                },
            ]
        );
    };

    const toggleSelect = (id: number) => {
        const newSet = new Set(selected);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelected(newSet);
    };

    const selectAll = () => {
        if (selected.size === sessions.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(sessions.map(s => s.id)));
        }
    };

    const exitSelectMode = () => {
        setSelectMode(false);
        setSelected(new Set());
    };

    const handleDeleteSelected = () => {
        if (selected.size === 0) return;
        Alert.alert(
            'Delete Sessions',
            `Delete ${selected.size} selected session(s) and all their data?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive', onPress: async () => {
                        setActionLoading(true);
                        try {
                            const serverUrl = getServerUrl();
                            await fetch(`${serverUrl}/api/sessions/delete-many`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', ...APP_SECRET_HEADER },
                                body: JSON.stringify({ ids: Array.from(selected) }),
                            });
                            exitSelectMode();
                            await fetchHistory();
                        } catch (err) {
                            Alert.alert('Error', 'Failed to delete sessions.');
                        } finally {
                            setActionLoading(false);
                        }
                    }
                },
            ]
        );
    };

    const handleClearAll = () => {
        Alert.alert(
            'Clear All Sessions',
            'Delete ALL sessions and attendance data? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All', style: 'destructive', onPress: async () => {
                        setActionLoading(true);
                        try {
                            const serverUrl = getServerUrl();
                            await fetch(`${serverUrl}/api/sessions/clear-all`, { method: 'POST', headers: APP_SECRET_HEADER });
                            exitSelectMode();
                            await fetchHistory();
                        } catch (err) {
                            Alert.alert('Error', 'Failed to clear sessions.');
                        } finally {
                            setActionLoading(false);
                        }
                    }
                },
            ]
        );
    };

    const handleExportSelected = async () => {
        setActionLoading(true);
        try {
            const serverUrl = getServerUrl();
            const ids = selected.size > 0 ? Array.from(selected).join(',') : sessions.map(s => s.id).join(',');
            const url = `${serverUrl}/api/export-multi?ids=${ids}&key=${encodeURIComponent(APP_SECRET_KEY)}`;
            const fileName = `Attendance_${selected.size > 0 ? 'Selected' : 'All'}.xlsx`;
            const filePath = `${FileSystem.documentDirectory}${fileName}`;

            const downloadResult = await FileSystem.downloadAsync(url, filePath);

            if (Platform.OS === 'android') {
                let directoryUri = await AsyncStorage.getItem('savedExportDirectory');
                let useSaved = false;
                const base64Data = await FileSystem.readAsStringAsync(downloadResult.uri, { encoding: FileSystem.EncodingType.Base64 });

                if (directoryUri) {
                    try {
                        const newUri = await FileSystem.StorageAccessFramework.createFileAsync(
                            directoryUri,
                            fileName,
                            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        );
                        await FileSystem.writeAsStringAsync(newUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
                        Alert.alert('Success', `File saved to chosen folder!`);
                        useSaved = true;
                    } catch (e) {
                        useSaved = false; // Folder deleted or permission revoked
                    }
                }

                if (!useSaved) {
                    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                    if (permissions.granted) {
                        await AsyncStorage.setItem('savedExportDirectory', permissions.directoryUri);
                        const newUri = await FileSystem.StorageAccessFramework.createFileAsync(
                            permissions.directoryUri,
                            fileName,
                            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        );
                        await FileSystem.writeAsStringAsync(newUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
                        Alert.alert('Success', `File saved to chosen folder!`);
                    } else {
                        Alert.alert('Permission Denied', 'Storage permission must be granted to save the file directly.');
                    }
                }
            } else {
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(downloadResult.uri, {
                        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        dialogTitle: 'Download Attendance',
                    });
                } else {
                    Alert.alert('Saved', `File saved to:\n${filePath}`);
                }
            }
        } catch (err: any) {
            Alert.alert('Download Error', err.message || 'Failed to download');
        } finally {
            setActionLoading(false);
        }
    };

    const viewResponses = (sessionName: string) => {
        if (selectMode) return;
        navigation.navigate('Responses', { sessionName });
    };

    const handleLongPress = (id: number) => {
        if (!selectMode) {
            setSelectMode(true);
            setSelected(new Set([id]));
        }
    };

    const renderItem = ({ item }: { item: SessionItem }) => {
        const isSelected = selected.has(item.id);
        const elapsedLocalMs = now - new Date(item.createdAt).getTime();
        const isEffectivelyActive = item.active && elapsedLocalMs <= 10 * 60 * 1000;

        let displayStoppedAt = item.stoppedAt;
        if (!isEffectivelyActive && item.active && !item.stoppedAt) {
            // It just crossed 10 mins locally but hasn't synced with server yet. Inject visually.
            displayStoppedAt = new Date(new Date(item.createdAt).getTime() + 10 * 60 * 1000).toISOString();
        }

        return (
            <TouchableOpacity
                style={[
                    styles.card,
                    isEffectivelyActive && styles.cardActive,
                    isSelected && styles.cardSelected,
                ]}
                onPress={() => selectMode ? toggleSelect(item.id) : viewResponses(item.name)}
                onLongPress={() => handleLongPress(item.id)}
                activeOpacity={0.7}
            >
                {/* Header row */}
                <View style={styles.cardTop}>
                    {selectMode ? (
                        <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                            {isSelected && <Text style={styles.checkboxIcon}>✓</Text>}
                        </View>
                    ) : (
                        <View style={[styles.statusDot, isEffectivelyActive && styles.statusDotActive]} />
                    )}
                    <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
                    {isEffectivelyActive && !selectMode && (
                        <TouchableOpacity
                            style={styles.stopBtn}
                            onPress={() => stopSession(item)}
                        >
                            <Text style={styles.stopBtnText}>⏹ Stop</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Date/Time info */}
                <View style={styles.timeRow}>
                    <Text style={styles.timeLabel}>🟢 Start:</Text>
                    <Text style={styles.timeValue}>{formatDateTime(item.createdAt)}</Text>
                </View>
                {displayStoppedAt ? (
                    <View style={styles.timeRow}>
                        <Text style={styles.timeLabel}>🔴 End:</Text>
                        <Text style={styles.timeValue}>{formatDateTime(displayStoppedAt)}</Text>
                    </View>
                ) : isEffectivelyActive ? (
                    <View style={styles.timeRow}>
                        <Text style={[styles.timeLabel, { color: '#22c55e' }]}>⏳ Running</Text>
                    </View>
                ) : null}

                <View style={styles.cardBottom}>
                    <View style={styles.chip}>
                        <Text style={styles.chipText}>👥 {item.responseCount}</Text>
                    </View>
                    <View style={[styles.chip, isEffectivelyActive && { backgroundColor: '#052e16', borderWidth: 1, borderColor: '#22c55e40' }]}>
                        <Text style={[styles.chipText, isEffectivelyActive && { color: '#4ade80' }]}>
                            ⏱ {formatDuration(item.createdAt, displayStoppedAt, isEffectivelyActive)}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.loadingText}>Loading history...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => selectMode ? exitSelectMode() : navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>{selectMode ? '✕ Cancel' : '← Back'}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>
                    {selectMode ? `${selected.size} Selected` : 'Session History'}
                </Text>
                {!selectMode ? (
                    <TouchableOpacity onPress={fetchHistory} style={styles.refreshBtn}>
                        <Text style={styles.refreshText}>🔄</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={selectAll} style={styles.refreshBtn}>
                        <Text style={styles.refreshText}>
                            {selected.size === sessions.length ? '☐' : '☑'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {!selectMode && (
                <Text style={styles.retentionNote}>📌 Sessions stored for 2 days • Long-press to select</Text>
            )}

            {sessions.length === 0 ? (
                <View style={styles.emptyBox}>
                    <Text style={styles.emptyIcon}>📭</Text>
                    <Text style={styles.emptyTitle}>No sessions yet</Text>
                    <Text style={styles.emptyDesc}>Start an attendance session from the home screen.</Text>
                </View>
            ) : (
                <FlatList
                    data={sessions}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    extraData={now}
                />
            )}

            {/* Bottom Action Bar */}
            {sessions.length > 0 && (
                <View style={styles.bottomBar}>
                    {actionLoading ? (
                        <View style={styles.actionLoading}>
                            <ActivityIndicator color="#6366f1" size="small" />
                            <Text style={styles.actionLoadingText}>  Processing...</Text>
                        </View>
                    ) : selectMode ? (
                        <>
                            <TouchableOpacity
                                style={[styles.bottomBtn, styles.exportBtn]}
                                onPress={handleExportSelected}
                                disabled={selected.size === 0}
                            >
                                <Text style={styles.bottomBtnText}>📥 Download ({selected.size})</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.bottomBtn, styles.deleteBtn]}
                                onPress={handleDeleteSelected}
                                disabled={selected.size === 0}
                            >
                                <Text style={styles.deleteBtnText}>🗑 Delete ({selected.size})</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <TouchableOpacity
                                style={[styles.bottomBtn, styles.exportBtn]}
                                onPress={handleExportSelected}
                            >
                                <Text style={styles.bottomBtnText}>📥 Download All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.bottomBtn, styles.clearBtn]}
                                onPress={handleClearAll}
                            >
                                <Text style={styles.clearBtnText}>🗑 Clear All</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a', paddingTop: 56 },
    centered: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#94a3b8', marginTop: 12, fontSize: 15 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 4 },
    backBtn: { padding: 8, marginRight: 8 },
    backText: { color: '#94a3b8', fontSize: 16, fontWeight: '600' },
    title: { flex: 1, fontSize: 22, fontWeight: '700', color: '#f1f5f9' },
    refreshBtn: { padding: 8 },
    refreshText: { fontSize: 20 },
    retentionNote: {
        fontSize: 12, color: '#f59e0b', paddingHorizontal: 28, marginBottom: 16,
        backgroundColor: 'rgba(245, 158, 11, 0.08)', marginHorizontal: 20,
        paddingVertical: 8, borderRadius: 8, textAlign: 'center',
    },
    listContent: { paddingHorizontal: 20, paddingBottom: 100 },
    card: {
        backgroundColor: '#1e293b', borderRadius: 16, padding: 18,
        marginBottom: 10, borderWidth: 1.5, borderColor: '#334155',
    },
    cardActive: { borderColor: '#22c55e', backgroundColor: '#052e16' },
    cardSelected: { borderColor: '#6366f1', backgroundColor: '#1e1b4b' },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 10 },
    statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#475569', marginTop: 5 },
    statusDotActive: { backgroundColor: '#22c55e' },
    checkbox: {
        width: 22, height: 22, borderRadius: 6, borderWidth: 2,
        borderColor: '#475569', justifyContent: 'center', alignItems: 'center', marginTop: 1,
    },
    checkboxChecked: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
    checkboxIcon: { color: '#fff', fontSize: 14, fontWeight: '700' },
    cardName: { flex: 1, fontSize: 16, fontWeight: '600', color: '#f1f5f9', lineHeight: 22 },

    // Stop button for active sessions
    stopBtn: {
        backgroundColor: '#dc2626', paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 8,
    },
    stopBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

    // Time rows
    timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, paddingLeft: 20 },
    timeLabel: { fontSize: 12, color: '#64748b', fontWeight: '600', width: 70 },
    timeValue: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },

    cardBottom: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', gap: 8, marginTop: 8 },
    chip: { backgroundColor: '#0f172a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    chipText: { fontSize: 13, fontWeight: '600', color: '#cbd5e1' },
    emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#e2e8f0', marginBottom: 4 },
    emptyDesc: { fontSize: 14, color: '#64748b', textAlign: 'center' },

    // Bottom bar
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 16,
        backgroundColor: '#0f172a', borderTopWidth: 1, borderTopColor: '#1e293b',
    },
    bottomBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    exportBtn: { backgroundColor: '#059669' },
    bottomBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    deleteBtn: { backgroundColor: '#450a0a', borderWidth: 1, borderColor: '#dc2626' },
    deleteBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '700' },
    clearBtn: { backgroundColor: '#450a0a', borderWidth: 1, borderColor: '#dc2626' },
    clearBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '700' },
    actionLoading: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14 },
    actionLoadingText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
});
