import React, { useState, useEffect, useCallback } from 'react';
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
import { getResponses, getServerUrl } from '../api';
import { REFRESH_INTERVAL_SEC, APP_SECRET_KEY, APP_SECRET_HEADER } from '../config';

interface ResponsesScreenProps {
    navigation: any;
    route: any;
}

interface ResponseRow {
    [key: string]: any;
}

export default function ResponsesScreen({ navigation, route }: ResponsesScreenProps) {
    const { sessionId, sessionName, sessionDurationMs, createdAt } = route.params;

    const [responses, setResponses] = useState<ResponseRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [summary, setSummary] = useState({ total: 0, present: 0, partial: 0, absent: 0 });

    useEffect(() => {
        if (!sessionDurationMs || !createdAt) return;
        
        const endTime = new Date(createdAt).getTime() + sessionDurationMs;
        
        const tick = () => {
            const now = Date.now();
            const remaining = endTime - now;
            if (remaining <= 0) {
                setTimeLeft(0);
            } else {
                setTimeLeft(remaining);
            }
        };

        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [sessionDurationMs, createdAt]);

    const formatTime = (ms: number) => {
        const totalSec = Math.max(0, Math.floor(ms / 1000));
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    const fetchData = useCallback(async (showLoader = false) => {
        if (showLoader) setLoading(true);
        else setRefreshing(true);

        try {
            const res = await fetch(`${getServerUrl()}/api/sessions/${sessionId}/full-report`, { headers: APP_SECRET_HEADER });
            const result = await res.json();
            if (result.success) {
                setResponses(result.report);
                setSummary(result.summary);
            }
        } catch (err: any) {
            console.warn('Fetch error:', err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [sessionId]);

    useEffect(() => { fetchData(true); }, []);

    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => fetchData(false), REFRESH_INTERVAL_SEC * 1000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchData]);

    const handleExport = async (action: 'download' | 'export') => {
        if (responses.length === 0) {
            Alert.alert('No Data', 'There are no responses to export.');
            return;
        }

        setMenuVisible(false);
        setExporting(true);
        try {
            const timestamp = sessionId;
            const safeName = sessionName.replace(/[^a-zA-Z0-9]/g, '_');
            const d = new Date(timestamp);
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            let hh = d.getHours();
            const min = String(d.getMinutes()).padStart(2, '0');
            const ampm = hh >= 12 ? 'PM' : 'AM';
            hh = hh % 12 || 12;
            const hhStr = String(hh).padStart(2, '0');
            const fileName = `attendance_${safeName}_${dd}-${mm}-${yyyy}_${hhStr}-${min}${ampm}.xlsx`;
            const filePath = `${FileSystem.documentDirectory}${fileName}`;

            const serverUrl = getServerUrl();
            const downloadUrl = `${serverUrl}/api/export?sessionId=${encodeURIComponent(sessionId)}`;
            const downloadResult = await FileSystem.downloadAsync(downloadUrl, filePath, {
                headers: APP_SECRET_HEADER,
            });

            if (action === 'export') {
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(downloadResult.uri, {
                        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        dialogTitle: 'Export Attendance',
                    });
                } else {
                    Alert.alert('Unavailable', 'Sharing is not available on this device');
                }
            } else {
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
            }
        } catch (err: any) {
            Alert.alert('Download Error', err.message || 'Failed to download');
        } finally {
            setExporting(false);
        }
    };

    const renderItem = ({ item, index }: { item: ResponseRow; index: number }) => (
        <View style={styles.row}>
            <View style={styles.rowHeader}>
                <Text style={styles.rowNumber}>#{index + 1}</Text>
                <Text style={styles.rowEmail} numberOfLines={1}>
                    {item['Email'] || item['email'] || 'N/A'}
                </Text>
            </View>
            <View style={styles.rowDetails}>
                <View style={styles.detailChip}>
                    <Text style={styles.detailLabel}>Reg No</Text>
                    <Text style={styles.detailValue}>{item['Reg No'] || item['Roll Number'] || '—'}</Text>
                </View>
                <View style={styles.detailChip}>
                    <Text style={styles.detailLabel}>Name</Text>
                    <Text style={styles.detailValue}>{item['Name'] || '—'}</Text>
                </View>
            </View>
            <View style={styles.rowDetails}>
                <View style={[styles.detailChip, { backgroundColor: '#0c4a6e' }]}>
                    <Text style={[styles.detailLabel, { color: '#7dd3fc' }]}>📅 Date</Text>
                    <Text style={[styles.detailValue, { color: '#bae6fd' }]}>{item['Date'] || item['date'] || '—'}</Text>
                </View>
                <View style={[styles.detailChip, { backgroundColor: '#0c4a6e' }]}>
                    <Text style={[styles.detailLabel, { color: '#7dd3fc' }]}>🕐 Time</Text>
                    <Text style={[styles.detailValue, { color: '#bae6fd' }]}>{item['Time'] || item['time'] || '—'}</Text>
                </View>
            </View>
            <View style={styles.rowStatus}>
                <View style={{flexDirection: 'row', gap: 8}}>
                    <View style={[styles.statusBadge, 
                        item.status === 'Present' ? styles.badgePresent : 
                        item.status === 'Partial Attendance' ? styles.badgePartial : styles.badgeAbsent]}>
                        <Text style={styles.statusBadgeText}>{item.status}</Text>
                    </View>
                    {item.networkStatus && (
                        <View style={[styles.statusBadge, 
                            item.networkStatus === 'campus' ? {backgroundColor: '#064e3b'} : 
                            item.networkStatus === 'external' ? {backgroundColor: '#78350f'} : {backgroundColor: '#334155'}]}>
                            <Text style={styles.statusBadgeText}>
                                {item.networkStatus === 'campus' ? '🏢 CAMPUS' : 
                                 item.networkStatus === 'external' ? '🌐 EXTERNAL' : '❓ UNKNOWN'}
                            </Text>
                        </View>
                    )}
                </View>
                {item.percentage !== undefined && (
                    <Text style={styles.percentageText}>{item.percentage}% Present</Text>
                )}
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.loadingText}>Loading responses...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={() => {
                        if (navigation.canGoBack()) {
                            navigation.goBack();
                        } else {
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Home' }],
                            });
                        }
                    }} 
                    style={styles.backBtn}
                >
                    <Text style={styles.backText}>← Home</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Responses</Text>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{responses.length}</Text>
                </View>
            </View>

            <Text style={styles.session} numberOfLines={1}>{sessionName}</Text>

            <View style={styles.summaryBar}>
              <View style={[styles.summaryChip, styles.summaryPresent]}>
                <Text style={styles.summaryChipNum}>{summary.present}</Text>
                <Text style={styles.summaryChipLabel}>Present</Text>
              </View>
              <View style={[styles.summaryChip, styles.summaryPartial]}>
                <Text style={styles.summaryChipNum}>{summary.partial}</Text>
                <Text style={styles.summaryChipLabel}>Partial</Text>
              </View>
              <View style={[styles.summaryChip, styles.summaryAbsent]}>
                <Text style={styles.summaryChipNum}>{summary.absent}</Text>
                <Text style={styles.summaryChipLabel}>Absent</Text>
              </View>
              <View style={[styles.summaryChip, styles.summaryTotal]}>
                <Text style={styles.summaryChipNum}>{summary.total}</Text>
                <Text style={styles.summaryChipLabel}>Total</Text>
              </View>
            </View>

            <View style={styles.controls}>
                <TouchableOpacity
                    style={[styles.controlBtn, autoRefresh && styles.controlBtnActive]}
                    onPress={() => setAutoRefresh(!autoRefresh)}
                >
                    <Text style={styles.controlBtnText}>{autoRefresh ? '🔄 Auto ON' : '⏸ Auto OFF'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlBtn} onPress={() => fetchData(false)}>
                    <Text style={styles.controlBtnText}>{refreshing ? '⏳' : '🔄'} Refresh</Text>
                </TouchableOpacity>

                {timeLeft !== null && (
                    <View style={styles.timerBox}>
                        <Text style={styles.timerLabel}>End in:</Text>
                        <Text style={styles.timerValue}>{formatTime(timeLeft)}</Text>
                    </View>
                )}
            </View>

            {responses.length === 0 ? (
                <View style={styles.emptyBox}>
                    <Text style={styles.emptyIcon}>📭</Text>
                    <Text style={styles.emptyTitle}>No responses yet</Text>
                    <Text style={styles.emptyDesc}>Waiting for students to submit...</Text>
                </View>
            ) : (
                <FlatList
                    data={responses}
                    renderItem={renderItem}
                    keyExtractor={(_, index) => index.toString()}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}

            <View style={styles.bottomActions}>
                {menuVisible && (
                    <View style={styles.menuContainer}>
                        <TouchableOpacity style={styles.menuItem} onPress={() => handleExport('download')}>
                            <Text style={styles.menuItemText}>📥  Download</Text>
                        </TouchableOpacity>
                        <View style={styles.menuDivider} />
                        <TouchableOpacity style={styles.menuItem} onPress={() => handleExport('export')}>
                            <Text style={styles.menuItemText}>📤  Export</Text>
                        </TouchableOpacity>
                    </View>
                )}
                <TouchableOpacity style={styles.exportBtn} onPress={() => setMenuVisible(!menuVisible)} disabled={exporting} activeOpacity={0.8}>
                    <Text style={styles.exportBtnText}>{exporting ? '⏳ Processing...' : '📥  Download  ▲'}</Text>
                </TouchableOpacity>
            </View>
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
    countBadge: { backgroundColor: '#6366f1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, minWidth: 36, alignItems: 'center' },
    countText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
    session: { fontSize: 13, color: '#64748b', paddingHorizontal: 28, marginBottom: 12 },
    controls: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 12 },
    controlBtn: { backgroundColor: '#1e293b', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#334155' },
    controlBtnActive: { borderColor: '#22c55e', backgroundColor: '#052e16' },
    controlBtnText: { color: '#e2e8f0', fontSize: 13, fontWeight: '600' },
    listContent: { paddingHorizontal: 20, paddingBottom: 12 },
    row: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
    rowHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    rowNumber: { fontSize: 14, fontWeight: '700', color: '#6366f1', marginRight: 10, minWidth: 28 },
    rowEmail: { flex: 1, fontSize: 14, color: '#e2e8f0' },
    rowDetails: { flexDirection: 'row', gap: 10 },
    detailChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 6 },
    detailLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
    detailValue: { fontSize: 13, color: '#cbd5e1', fontWeight: '600' },
    emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#e2e8f0', marginBottom: 4 },
    emptyDesc: { fontSize: 14, color: '#64748b', textAlign: 'center' },
    summaryBar: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16 },
    summaryChip: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
    summaryChipNum: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
    summaryChipLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
    summaryPresent: { backgroundColor: '#064e3b', borderColor: '#10b981' },
    summaryPartial: { backgroundColor: '#451a03', borderColor: '#f59e0b' },
    summaryAbsent:  { backgroundColor: '#450a0a', borderColor: '#ef4444' },
    summaryTotal:   { backgroundColor: '#1e293b', borderColor: '#64748b' },
    rowStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(51,65,85,0.4)' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    badgePresent: { backgroundColor: '#064e3b' },
    badgePartial: { backgroundColor: '#451a03' },
    badgeAbsent: { backgroundColor: '#450a0a' },
    statusBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    percentageText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
    timerBox: { flex: 1, backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12 },
    timerLabel: { color: '#64748b', fontSize: 11, fontWeight: '600' },
    timerValue: { color: '#ffffff', fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
    bottomActions: { paddingHorizontal: 20, paddingVertical: 16, gap: 10, borderTopWidth: 1, borderTopColor: '#1e293b' },
    menuContainer: { backgroundColor: '#1e293b', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: '#334155' },
    menuItem: { paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' },
    menuDivider: { height: 1, backgroundColor: '#334155', marginHorizontal: 8 },
    menuItemText: { color: '#f1f5f9', fontSize: 16, fontWeight: '600' },
    exportBtn: { backgroundColor: '#059669', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
    exportBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
