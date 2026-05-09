import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { User } from '../models/User';
import { config } from '../lib/config';
import { ApiError } from '../utils/ApiError';

const BCRYPT_ROUNDS = 12;

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
