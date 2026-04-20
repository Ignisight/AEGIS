import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getUser } from '../api';

const { width } = Dimensions.get('window');

export default function RoleScreen({ navigation }: any) {
    const handleTeacher = async () => {
        const user = await getUser();
        if (user) {
            navigation.navigate('Home', {
                userName: user.name,
                userEmail: user.email,
                userCollege: user.college,
                userDepartment: user.department,
                userAllowedDomain: user.allowedDomain || '',
            });
        } else {
            navigation.navigate('Login');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Welcome to A.E.G.I.S</Text>
                    <Text style={styles.subtitle}>Please select your role to continue</Text>
                </View>

                <View style={styles.roleContainer}>
                    <TouchableOpacity
                        style={styles.roleCard}
                        onPress={handleTeacher}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.icon}>👨‍🏫</Text>
                        <Text style={styles.roleTitle}>I am a Teacher</Text>
                        <Text style={styles.roleDesc}>Create and manage attendance sessions</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.roleCard, styles.studentCard]}
                        onPress={() => navigation.navigate('StudentLogin')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.icon}>👨‍🎓</Text>
                        <Text style={styles.roleTitle}>I am a Student</Text>
                        <Text style={styles.roleDesc}>Scan QR codes and submit attendance</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 60,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#94a3b8',
        textAlign: 'center',
    },
    roleContainer: {
        gap: 24,
    },
    roleCard: {
        backgroundColor: '#1e293b',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    studentCard: {
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.05)',
    },
    icon: {
        fontSize: 48,
        marginBottom: 16,
    },
    roleTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 8,
    },
    roleDesc: {
        fontSize: 14,
        color: '#94a3b8',
        textAlign: 'center',
    },
});
