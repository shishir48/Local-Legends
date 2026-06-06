import { Linking } from 'react-native';
import * as Updates from 'expo-updates';
import { appVersionApi } from '../services/api';

const ANDROID_PACKAGE = 'com.shishir48.locallegend';
const PLAY_WEB = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

export type UpdateKind = 'ota' | 'native' | null;

/** a < b for dotted numeric versions. Returns false if either isn't comparable. */
export function semverLt(a: string, b: string): boolean {
  const pa = a.split('.').map((n) => Number(n));
  const pb = b.split('.').map((n) => Number(n));
  if (pa.some(Number.isNaN) || pb.some(Number.isNaN)) return false;
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
}

/**
 * Decide what (if anything) to prompt on app open. OTA takes priority — it's
 * instant and in-app. Only when no OTA is pending do we consider whether the
 * native build itself is behind (needs a store update). Best-effort; any error
 * → no prompt. Disabled in dev / Expo Go where Updates isn't active.
 */
export async function checkForUpdate(): Promise<UpdateKind> {
  if (__DEV__ || !Updates.isEnabled) return null;

  try {
    const res = await Updates.checkForUpdateAsync();
    if (res.isAvailable) return 'ota';
  } catch {
    // ignore — fall through to the native check
  }

  try {
    const { latestRuntimeVersion } = await appVersionApi.get();
    const current = Updates.runtimeVersion;
    if (current && semverLt(current, latestRuntimeVersion)) return 'native';
  } catch {
    // ignore
  }

  return null;
}

/** Fetch and apply the pending OTA, then relaunch into it. */
export async function applyOtaUpdate(): Promise<void> {
  await Updates.fetchUpdateAsync();
  await Updates.reloadAsync();
}

/** Open the Play Store app (falls back to the web listing). */
export async function openStore(): Promise<void> {
  const market = `market://details?id=${ANDROID_PACKAGE}`;
  try {
    const url = (await appVersionApi.get()).androidStoreUrl || PLAY_WEB;
    const canMarket = await Linking.canOpenURL(market);
    await Linking.openURL(canMarket ? market : url);
  } catch {
    await Linking.openURL(PLAY_WEB);
  }
}
