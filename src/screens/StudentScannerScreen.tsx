import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { DEFAULT_SERVER_URL, APP_SECRET_HEADER, APP_SECRET_KEY } from '../config';
import * as ImagePicker from 'expo-image-picker';

export default function StudentScannerScreen({ navigation }: any) {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    const [studentInfo, setStudentInfo] = useState<{ email: string, deviceId: string } | null>(null);
    const [message, setMessage] = useState('Aim camera at the Teacher\'s QR Code');

    useEffect(() => {
        (async () => {
            const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
            const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
            setHasPermission(cameraStatus === 'granted' && locationStatus === 'granted');

            const savedString = await AsyncStorage.getItem('student_user');
            if (savedString) {
                setStudentInfo(JSON.parse(savedString));
            } else {
                navigation.replace('StudentLogin');
            }
        })();
    }, []);

    const handleBarcodeScanned = async ({ type, data }: { type: string, data: string }) => {
        if (scanned || !studentInfo) return;
        setScanned(true);

        try {
            await processQRData(data);
        } catch (error: any) {
            Alert.alert('Network Error', error.message || 'Failed to submit attendance.');
            setScanned(false);
            setMessage('Network error. Try scanning again.');
        }
    };

    const processQRData = async (data: string) => {
        if (!studentInfo) return;

        // Validate it's an attendance QR code
        const match = data.match(/\/s\/([a-zA-Z0-9_-]+)/);
        if (!match) {
            setMessage('Invalid QR code scanned. Try again.');
            setTimeout(() => setScanned(false), 3000);
            return;
        }

        const sessionCode = match[1];
        setMessage('📍 Getting Location...');

        // Geolocation Fetch with Mock Location detection
        let location;
        try {
            location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            
            // [SECURITY] Detect mock location / GPS spoofing
            if (location.mocked) {
                Alert.alert('Access Denied', 'GPS spoofing detected. Use your physical location.');
                setScanned(false);
                setMessage('GPS Spoofing detected');
                return;
            }
        } catch (err) {
            setMessage('Failed to get Location. Retrying...');
            location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        }

        setMessage('⏳ Submitting Attendance...');

        // [SECURITY] Cryptographic Request Signing & Integrity Verification (Issue #8)
        const timestamp = Date.now().toString();
        const payload = studentInfo.email.toLowerCase().trim() + studentInfo.deviceId + sessionCode;
        const signature = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            payload + timestamp + APP_SECRET_KEY
        );

        // Submit to specifically the React Native mobile API
        const res = await fetch(`${DEFAULT_SERVER_URL}/api/student/submit`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                ...APP_SECRET_HEADER,
                'x-signature': signature,
                'x-timestamp': timestamp
            },
            body: JSON.stringify({
                email: studentInfo.email,
                deviceId: studentInfo.deviceId,
                sessionCode: sessionCode,
                lat: location.coords.latitude,
                lon: location.coords.longitude
            })
        });

        const responseText = await res.text();
        let resultData;
        try { resultData = JSON.parse(responseText); } catch (e) { throw new Error('Crashed: ' + responseText); }


        if (resultData.success) {
            Alert.alert('✅ Attendance Recorded!', 'You are marked present for this session.', [
                { text: 'OK', onPress: () => setScanned(false) }
            ]);
            setMessage('Success! Ready to scan again.');
        } else {
            Alert.alert('Attendance Failed', resultData.error || 'Unknown error occurred.', [
                { text: 'Try Again', onPress: () => setScanned(false) }
            ]);
            setMessage('Failed. Try scanning again.');
        }
    };

    const processImageWithServer = async (uri: string) => {
        try {
            setMessage('Uploading image for scanning...');
            const formData = new FormData();
            formData.append('qrimage', {
                uri,
                name: 'scan.jpg',
                type: 'image/jpeg'
            } as any);

            const res = await fetch(`${DEFAULT_SERVER_URL}/api/student/decode-qr`, {
                method: 'POST',
                headers: APP_SECRET_HEADER,
                body: formData
            });
            const data = await res.json();

            if (data.success && data.data) {
                await processQRData(data.data);
            } else {
                Alert.alert('No QR Found', data.error || 'Failed to detect a QR code in the image.');
                setScanned(false);
                setMessage('Ready to scan');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to reach server for decoding.');
            setScanned(false);
            setMessage('Ready to scan');
        }
    };

    const uploadFromGallery = async () => {
        if (scanned || !studentInfo) return;
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setScanned(true);
                await processImageWithServer(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to process gallery image.');
            setScanned(false);
            setMessage('Ready to scan');
        }
    };

    if (hasPermission === null) {
        return <View style={styles.container}><Text style={styles.text}>Requesting permissions...</Text></View>;
    }
    if (hasPermission === false) {
        return <View style={styles.container}><Text style={styles.text}>No access to camera or location. Please allow in settings.</Text></View>;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.logoutBtn}>
                    <Text style={styles.logoutText}>← Dashboard</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Scan Session QR</Text>
                <View style={{ width: 60 }} />
            </View>

            <View style={styles.cameraFrame}>
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ["qr"],
                    }}
                >
                    <View style={styles.overlay}>
                        <View style={styles.unfocusedContainer} />
                        <View style={styles.middleContainer}>
                            <View style={styles.unfocusedContainer} />
                            <View style={styles.focusedContainer} />
                            <View style={styles.unfocusedContainer} />
                        </View>
                        <View style={styles.unfocusedContainer} />
                    </View>
                </CameraView>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>{studentInfo?.email}</Text>
                <Text style={[styles.statusText, scanned && { color: '#f59e0b' }, { marginBottom: 16 }]}>{message}</Text>

                <TouchableOpacity style={styles.uploadBtn} onPress={uploadFromGallery} disabled={scanned}>
                    <Text style={styles.uploadBtnText}>🖼️ Upload QR from Gallery</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    text: { color: 'white', alignSelf: 'center', marginTop: '50%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
    logoutBtn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#1e293b', borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
    logoutText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
    cameraFrame: { flex: 1, overflow: 'hidden' },
    overlay: { flex: 1, backgroundColor: 'transparent' },
    unfocusedContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
    middleContainer: { flexDirection: 'row', flex: 1.5 },
    focusedContainer: { flex: 6, borderWidth: 2, borderColor: '#22c55e', backgroundColor: 'transparent' },
    footer: { padding: 30, backgroundColor: '#0f172a', alignItems: 'center' },
    footerText: { color: '#94a3b8', fontSize: 13, marginBottom: 8, fontWeight: '500' },
    statusText: { color: '#22c55e', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
    uploadBtn: { width: '100%', backgroundColor: '#1e293b', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
    uploadBtnText: { color: '#f1f5f9', fontSize: 14, fontWeight: '700' }
});
