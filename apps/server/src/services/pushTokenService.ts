import { PushToken, type PushPlatform } from '../models/PushToken';

/**
 * Upsert a device's push token, binding it to the given user. Re-registering
 * the same token just rebinds it (latest login wins) — never duplicates.
 */
export async function registerToken(
  userId: string,
  token: string,
  platform: PushPlatform
): Promise<void> {
  await PushToken.findOneAndUpdate(
    { token },
    { token, user: userId, platform },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

/** Remove a device's token (logout, or when FCM reports it stale). */
export async function removeToken(token: string): Promise<void> {
  await PushToken.deleteOne({ token });
}

/** All tokens for a user (across their devices). */
export async function tokensForUser(userId: string): Promise<string[]> {
  const rows = await PushToken.find({ user: userId }).select('token').lean();
  return rows.map((r) => r.token);
}
