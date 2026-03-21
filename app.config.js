// Dynamic Expo config — reads secrets from environment variables at build time
// This file replaces app.json and is NOT committed to GitHub with secrets

module.exports = ({ config }) => {
    return {
        ...config,
        name: "Attendance System",
        slug: "attendance-system",
        version: "2.5.1",
        orientation: "portrait",
        icon: "./assets/icon.png",
        userInterfaceStyle: "dark",
        newArchEnabled: false,
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
                projectId: "8fbb94c8-1140-415e-95c3-64e1da1b5cc3",
            },
        },
        plugins: [
            "expo-camera",
            "expo-location",
            [
                "expo-image-picker",
                {
                    photosPermission: "Allow Attendance System to access your photos to scan QR codes from gallery.",
                    cameraPermission: "Allow Attendance System to use camera to take pictures of QR codes.",
                },
            ],
        ],
    };
};
