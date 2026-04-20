module.exports = ({ config }) => {
    // Project Configuration
    const PROJECTS = {
      default: { 
        id: "8f17474b-1110-47b2-86ff-26ab0cb198d2", 
        slug: "aegis-app" 
      }
    };
    
    const activeProject = PROJECTS.default;

    return {
        ...config,
        name: "A.E.G.I.S",
        slug: activeProject.slug,
        version: "2.7.0",
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
        runtimeVersion: {
            policy: "appVersion",
        },
        extra: {
            APP_SECRET_KEY: process.env.APP_SECRET_KEY || "MISSING_KEY",
            eas: {
                projectId: activeProject.id,
            },
        },
        plugins: [
            "expo-camera",
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
