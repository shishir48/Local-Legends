import fs from 'fs';
import admin from 'firebase-admin';
import { tokensForUser, removeToken } from '../services/pushTokenService';

// Push is OPTIONAL. When FCM_SERVICE_ACCOUNT_PATH is unset or the file can't be
// loaded, push is disabled and every send becomes a logged no-op — so dev and
// CI run with zero Firebase setup, and prod degrades safely if misconfigured.
let messaging: admin.messaging.Messaging | null = null;

export function pushEnabled(): boolean {
  return messaging !== null;
}

/** Initialize firebase-admin once at boot. Safe to call when unconfigured. */
export function initPush(): void {
  const path = process.env.FCM_SERVICE_ACCOUNT_PATH?.trim();
  if (!path) {
    console.warn('[push] FCM_SERVICE_ACCOUNT_PATH unset — push disabled');
    return;
  }
  try {
    const raw = fs.readFileSync(path, 'utf8');
    const serviceAccount = JSON.parse(raw) as admin.ServiceAccount;
    const app = admin.apps.length
      ? admin.app()
      : admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    messaging = app.messaging();
    console.log('[push] firebase-admin initialized — push enabled');
  } catch (err) {
    console.warn('[push] failed to init firebase-admin — push disabled:', (err as Error).message);
    messaging = null;
  }
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send a notification to every device a user owns. No-op when push is disabled
 * or the user has no tokens. Prunes tokens FCM reports as unregistered/invalid.
 * Never throws — errors are swallowed and logged.
 */
export async function sendToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!messaging) return;
  try {
    const tokens = await tokensForUser(userId);
    if (tokens.length === 0) return;

    const res = await messaging.sendEachForMulticast({
      tokens,
      notification: { title: payload.title, body: payload.body },
      data: payload.data ?? {},
    });

    if (res.failureCount > 0) {
      await Promise.all(
        res.responses.map(async (r, i) => {
          if (r.success) return;
          const code = r.error?.code ?? '';
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-argument'
          ) {
            await removeToken(tokens[i]);
          }
        })
      );
    }
  } catch (err) {
    console.warn('[push] sendToUser failed:', (err as Error).message);
  }
}
