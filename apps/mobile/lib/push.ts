import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { pushApi } from '../services/api';

const ASKED_KEY = 'll.push.asked';
const TOKEN_KEY = 'll.push.token';

const LAST_PROMPT_KEY = 'll.push.lastPrompt';
const PROMPT_INTERVAL_MS = 24 * 60 * 60 * 1000;

export async function shouldShowDailyPrompt(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return false;

    const last = await SecureStore.getItemAsync(LAST_PROMPT_KEY);
    if (last) {
      const elapsed = Date.now() - Number(last);
      if (elapsed < PROMPT_INTERVAL_MS) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function markPromptShown(): Promise<void> {
  try {
    await SecureStore.setItemAsync(LAST_PROMPT_KEY, String(Date.now()));
  } catch {
    // best-effort
  }
}

/** Show foreground pushes as a banner too (not just in the tray). */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Ask for permission (if needed) and sync this device's native FCM token to the
 * server. Best-effort: any failure (emulator, denied, offline) returns quietly.
 *
 * @param promptIfUndetermined when false, only registers if permission is
 *   already granted (silent launch re-sync); when true, may show the OS prompt.
 */
export async function registerForPush(promptIfUndetermined = false): Promise<void> {
  try {
    if (!Device.isDevice || Platform.OS !== 'android') return;

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      if (!promptIfUndetermined) return;
      status = (await Notifications.requestPermissionsAsync()).status;
      await SecureStore.setItemAsync(ASKED_KEY, '1');
      if (status !== 'granted') return;
    }

    const { data: token } = await Notifications.getDevicePushTokenAsync();
    if (typeof token !== 'string' || !token) return;

    await pushApi.register(token, 'android');
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    // best-effort; never block the app on push setup
  }
}

/** Remove this device's token from the account (logout). */
export async function unregisterPush(): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) await pushApi.remove(token);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // best-effort
  }
}

/** True once we've shown the OS permission prompt (so we don't re-nag). */
export async function hasAskedForPush(): Promise<boolean> {
  return (await SecureStore.getItemAsync(ASKED_KEY)) === '1';
}
