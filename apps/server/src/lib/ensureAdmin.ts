import { User } from '../models/User';

/**
 * Promote the ADMIN_EMAIL user to admin on startup. Idempotent and a no-op when
 * ADMIN_EMAIL is unset or the user hasn't registered yet — so it's safe to run
 * on every boot. Read at call time (not the frozen config) so it's easy to set
 * in tests, mirroring the places-route key handling.
 */
export async function ensureAdminUser(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  if (!email) return;
  const res = await User.updateOne(
    { email, isAdmin: { $ne: true } },
    { $set: { isAdmin: true } }
  );
  if (res.modifiedCount > 0) {
    console.log(`[admin] promoted ${email} to admin`);
  }
}
