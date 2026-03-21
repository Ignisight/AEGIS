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
import { REFRESH_INTERVAL_SEC, APP_SECRET_KEY } from '../config';

interface ResponsesScreenProps {
    navigation: any;
    route: any;
}

interface ResponseRow {
    [key: string]: any;
}

export default function ResponsesScreen({ navigation, route }: ResponsesScreenProps) {
    const { sessionName } = route.params;

    const [responses, setResponses] = useState<ResponseRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchData = useCallback(async (showLoader = false) => {
        if (showLoader) setLoading(true);
        else setRefreshing(true);

        try {
            const result = await getResponses(sessionName);
            if (result.responses) setResponses(result.responses);
        } catch (err: any) {
            console.warn('Fetch error:', err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [sessionName]);

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
            // Download Excel directly from server
            const serverUrl = getServerUrl();
            const downloadUrl = `${serverUrl}/api/export?sessionName=${encodeURIComponent(sessionName)}&key=${encodeURIComponent(APP_SECRET_KEY)}`;
            const fileName = `Attendance_${sessionName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
            const filePath = `${FileSystem.documentDirectory}${fileName}`;

            const downloadResult = await FileSystem.downloadAsync(downloadUrl, filePath);

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
                    <Text style={[styles.detailValue, { color: '#bae6fd' }]}>{item['Date'] || '—'}</Text>
                </View>
                <View style={[styles.detailChip, { backgroundColor: '#0c4a6e' }]}>
                    <Text style={[styles.detailLabel, { color: '#7dd3fc' }]}>🕐 Time</Text>
                    <Text style={[styles.detailValue, { color: '#bae6fd' }]}>{item['Time'] || '—'}</Text>
                </View>
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
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Responses</Text>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{responses.length}</Text>
                </View>
            </View>

            <Text style={styles.session} numberOfLines={1}>{sessionName}</Text>

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
    bottomActions: { paddingHorizontal: 20, paddingVertical: 16, gap: 10, borderTopWidth: 1, borderTopColor: '#1e293b' },
    menuContainer: { backgroundColor: '#1e293b', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: '#334155' },
    menuItem: { paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' },
    menuDivider: { height: 1, backgroundColor: '#334155', marginHorizontal: 8 },
    menuItemText: { color: '#f1f5f9', fontSize: 16, fontWeight: '600' },
    exportBtn: { backgroundColor: '#059669', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
    exportBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
