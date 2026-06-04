import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { User } from '../models/User';
import { config } from '../lib/config';
import { ApiError } from '../utils/ApiError';
import { sendPasswordResetCode } from '../lib/email';

const BCRYPT_ROUNDS = 12;

const RESET_CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const RESET_MAX_ATTEMPTS = 5;

function generateResetCode(): string {
  // 6-digit numeric, zero-padded.
  return String(Math.floor(100000 + Math.random() * 900000));
}

function signToken(userId: string, email: string): string {
  return jwt.sign(
    { sub: userId, email },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN } as SignOptions
  );
}

export async function register(input: {
  email: string;
  password: string;
  displayName: string;
}) {
  const existing = await User.findOne({ email: input.email.toLowerCase() }).lean();
  if (existing) throw ApiError.conflict('Email already registered');

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const user = await User.create({
    email: input.email,
    passwordHash,
    displayName: input.displayName,
  });

  const token = signToken(user._id.toString(), user.email);
  return { user: user.toJSON(), token };
}

export async function login(input: { email: string; password: string }) {
  const user = await User.findOne({ email: input.email.toLowerCase() });
  if (!user) throw ApiError.unauthorized('Invalid credentials');

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

  const token = signToken(user._id.toString(), user.email);
  return { user: user.toJSON(), token };
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await User.findOne({ email: email.toLowerCase() });
  // Anti-enumeration: silently return if the user does not exist.
  if (!user) return;

  const code = generateResetCode();
  user.resetCodeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);
  user.resetCodeExpires = new Date(Date.now() + RESET_CODE_TTL_MS);
  user.resetAttempts = 0;
  await user.save();

  // Never let a delivery failure propagate: a thrown error would turn the
  // controller's generic 200 into a 500, leaking whether the email exists
  // (enumeration). Log and swallow — the user can request a new code.
  try {
    await sendPasswordResetCode(user.email, code);
  } catch (err) {
    console.error('[auth] failed to send password reset email:', err);
  }
}

export async function resetPassword(input: {
  email: string;
  code: string;
  newPassword: string;
}) {
  const user = await User.findOne({ email: input.email.toLowerCase() });

  const invalid = () => ApiError.badRequest('Invalid or expired code');

  if (
    !user ||
    !user.resetCodeHash ||
    !user.resetCodeExpires ||
    user.resetCodeExpires.getTime() <= Date.now() ||
    user.resetAttempts >= RESET_MAX_ATTEMPTS
  ) {
    throw invalid();
  }

  const ok = await bcrypt.compare(input.code, user.resetCodeHash);
  if (!ok) {
    user.resetAttempts += 1;
    await user.save();
    throw invalid();
  }

  user.passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
  user.resetCodeHash = null;
  user.resetCodeExpires = null;
  user.resetAttempts = 0;
  await user.save();

  const token = signToken(user._id.toString(), user.email);
  return { user: user.toJSON(), token };
}
