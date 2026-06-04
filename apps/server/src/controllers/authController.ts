import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/authService';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';

const RegisterSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  displayName: z.string().min(1).max(50).trim(),
});

const LoginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

const ForgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});

const ResetPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const input = RegisterSchema.parse(req.body);
    const result = await authService.register(input);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const input = LoginSchema.parse(req.body);
    const result = await authService.login(input);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const user = await User.findById(req.user.id);
    if (!user) throw ApiError.notFound('User not found');
    res.json(user.toJSON());
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = ForgotPasswordSchema.parse(req.body);
    await authService.requestPasswordReset(email);
    res.json({ message: 'If that email exists, a reset code has been sent.' });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const input = ResetPasswordSchema.parse(req.body);
    const result = await authService.resetPassword(input);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
