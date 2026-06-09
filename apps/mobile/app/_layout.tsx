import { useEffect } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { queryClient } from '../services/queryClient';
import { useAuthStore } from '../stores/authStore';
import { registerForPush } from '../lib/push';
import { colors } from '../utils/theme';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { UpdateGate } from '../components/UpdateGate';
import { PushGate } from '../components/PushGate';
import { logger, setLoggerUserIdResolver } from '../services/logger';

/** Open the gem from a tapped push, if it carries a gemId. */
function routeFromNotification(
  response: Notifications.NotificationResponse | null,
  go: (path: string) => void
) {
  const gemId = response?.notification.request.content.data?.gemId;
  if (typeof gemId === 'string' && gemId) go(`/gems/${gemId}`);
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isHydrated) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!token && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [token, isHydrated, segments, router]);

  // Logged in → silently re-sync the push token (it rotates) if already granted.
  useEffect(() => {
    if (isHydrated && token) registerForPush(false);
  }, [isHydrated, token]);

  // Deep-link from a tapped notification (cold start + while running).
  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then((r) =>
      routeFromNotification(r, (p) => router.push(p))
    );
    const sub = Notifications.addNotificationResponseReceivedListener((r) =>
      routeFromNotification(r, (p) => router.push(p))
    );
    return () => sub.remove();
  }, [router]);

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  useEffect(() => {
    setLoggerUserIdResolver(() => useAuthStore.getState().user?.id ?? undefined);
    const prevHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      logger.error(error.message, { stack: error.stack, isFatal: isFatal ?? false });
      prevHandler?.(error, isFatal);
    });
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" />
          <AuthGate>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(app)" />
            </Stack>
          </AuthGate>
          <UpdateGate />
          <PushGate />
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
