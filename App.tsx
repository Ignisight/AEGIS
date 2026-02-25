import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import HomeScreen from './src/screens/HomeScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SessionScreen from './src/screens/SessionScreen';
import ResponsesScreen from './src/screens/ResponsesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import RoleScreen from './src/screens/RoleScreen';
import StudentLoginScreen from './src/screens/StudentLoginScreen';
import StudentDashboardScreen from './src/screens/StudentDashboardScreen';
import StudentScannerScreen from './src/screens/StudentScannerScreen';

const Stack = createNativeStackNavigator();

const DarkTheme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        background: '#0f172a',
        card: '#1e293b',
        text: '#f1f5f9',
        border: '#334155',
        primary: '#6366f1',
    },
};

export default function App() {
    return (
        <NavigationContainer theme={DarkTheme}>
            <StatusBar style="light" />
            <Stack.Navigator
                initialRouteName="RoleSelection"
                screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right',
                    contentStyle: { backgroundColor: '#0f172a' },
                }}
            >
                <Stack.Screen name="RoleSelection" component={RoleScreen} />
                <Stack.Screen name="StudentLogin" component={StudentLoginScreen} />
                <Stack.Screen name="StudentDashboard" component={StudentDashboardScreen} />
                <Stack.Screen name="StudentScanner" component={StudentScannerScreen} />

                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
                <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="History" component={HistoryScreen} />
                <Stack.Screen name="Session" component={SessionScreen} />
                <Stack.Screen name="Responses" component={ResponsesScreen} />
                <Stack.Screen name="Settings" component={SettingsScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
