module.exports = {
  expo: {
    name: 'Local Legend',
    slug: 'local-legend',
    version: '1.2.3',
    orientation: 'portrait',
    scheme: 'locallegend',
    updates: {
      url: 'https://u.expo.dev/55c340e3-bae4-4dd8-ae7f-0c818bc45be9',
      // Wait up to 3s on launch for a newer OTA before falling back to the
      // cached bundle, so updates apply on the first relaunch instead of the
      // second. Native config — only takes effect in a new build, not via OTA.
      fallbackToCacheTimeout: 3000,
    },
    // Pinned (not appVersion policy) so `version` can bump on every change
    // while OTA targeting stays constant. Existing installs were built at
    // appVersion 1.1.4 → their embedded runtimeVersion is already '1.1.4',
    // so EAS updates under this runtime reach them. Only bump this string
    // when a NATIVE change (new native module / SDK) requires a rebuild.
    // Bumped 1.1.4 → 1.2.0: added expo-notifications (FCM) — native module, so
    // a new build must ship under this runtime before its OTAs reach devices.
    // Bumped 1.2.0 → 1.3.0: added react-native-maps.
    runtimeVersion: '1.3.0',
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
      versionCode: 7,
      // Firebase config for FCM push. Required for the production build; kept
      // out of git (see .gitignore). Override path with GOOGLE_SERVICES_JSON.
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || './google-services.json',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0F172A',
      },
      permissions: [
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'POST_NOTIFICATIONS',
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
      'expo-notifications',
      'expo-build-properties',
      [
        'react-native-maps',
        {
          locationWhenInUsePermission: 'Show your location on the gem map.',
        },
      ],
    ],

    extra: {
      // Default to production so OTA bundles (exported without API_URL) and
      // any build that forgets the env still hit the live API. For local dev,
      // run with API_URL=http://<your-LAN-ip>:4000.
      apiUrl: process.env.API_URL || 'https://shishir.cloud',
      eas: {
        projectId: '55c340e3-bae4-4dd8-ae7f-0c818bc45be9',
      },
    },
  },
};
