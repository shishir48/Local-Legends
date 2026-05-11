module.exports = {
  expo: {
    name: 'Local Legend',
    slug: 'local-legend',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'locallegend',
    userInterfaceStyle: 'dark',

    icon: './assets/icon.png',

    splash: {
      image: './assets/splash.png',
      backgroundColor: '#0F172A',
      resizeMode: 'contain',
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.shishir48.locallegend',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'Local Legend uses your location to show gems nearby and to attach a location when you submit a new gem.',
        NSPhotoLibraryUsageDescription:
          'Local Legend needs photo library access so you can attach a photo to a gem.',
        NSCameraUsageDescription:
          'Local Legend needs camera access so you can take a photo for a gem submission.',
      },
    },

    android: {
      package: 'com.shishir48.locallegend',
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0F172A',
      },
      permissions: [
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
      ],
    },

    plugins: [
      'expo-router',
      'expo-secure-store',
      [
        'expo-image-picker',
        {
          photosPermission: 'Local Legend accesses your photos to let you attach one to a gem.',
          cameraPermission: 'Local Legend accesses your camera to let you take a photo for a gem.',
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: 'Allow Local Legend to use your location.',
        },
      ],
    ],

    extra: {
      apiUrl: process.env.API_URL || 'http://192.168.18.131:4000',
      eas: {
        projectId: process.env.EAS_PROJECT_ID || '',
      },
    },
  },
};
