require('dotenv').config();

module.exports = ({ config }) => {
    // Project Configuration
    const PROJECTS = {
      default: { 
        id: "df0a81f0-ecc3-4864-aaf6-42ef27b830d2", 
        slug: "attendance-app" 
      },
      secondary: {
        id: "8fbb94c8-1140-415e-95c3-64e1da1b5cc3",
        slug: "attendance-system"
      }
    };
    
    // Switch to secondary if primary (default) hits EAS limits
    const activeProject = PROJECTS.default; 

    return {
        ...config,
        name: "A.E.G.I.S",
        owner: "hexagon122",
        slug: "aegis-app-final",
        version: "2.8.0",
        runtimeVersion: {
            policy: "appVersion"
        },
        updates: {
            url: "https://u.expo.dev/4ec532fe-8c91-4fef-94f4-45e42cfeeb36",
            fallbackToCacheTimeout: 0
        },
        orientation: "portrait",
        icon: "./assets/icon.png",
        userInterfaceStyle: "dark",
        newArchEnabled: false,
        jsEngine: "hermes",
        splash: {
            backgroundColor: "#0f172a",
        },
        android: {
            adaptiveIcon: {
                foregroundImage: "./assets/adaptive-icon.png",
                backgroundColor: "#0f172a",
            },
            package: "com.attendance.system",
        },
        extra: {
            APP_SECRET_KEY: process.env.APP_SECRET_KEY || "MISSING_KEY",
            eas: {
                projectId: "4ec532fe-8c91-4fef-94f4-45e42cfeeb36",
            },
        },
        plugins: [
            "expo-camera",
            "@react-native-google-signin/google-signin",
            [
                "expo-location",
                {
                    "locationAlwaysAndWhenInUsePermission": "A.E.G.I.S needs location access to verify you remain in the classroom during the session.",
                    "locationWhenInUsePermission": "A.E.G.I.S needs location access to verify you are in the classroom.",
                    "isAndroidBackgroundLocationEnabled": true,
                    "isAndroidForegroundServiceEnabled": true
                }
            ],
            [
                "expo-image-picker",
                {
                    photosPermission: "Allow A.E.G.I.S to access your photos to scan QR codes from gallery.",
                    cameraPermission: "Allow A.E.G.I.S to use camera to take pictures of QR codes.",
                },
            ],
        ],
    };
};
