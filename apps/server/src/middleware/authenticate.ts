import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../lib/config';
import { ApiError } from '../utils/ApiError';
import { User } from '../models/User';

interface JwtPayload {
  sub: string;  // user id
  email: string;
  iat: number;
  exp: number;
}

/**
 * Reads `Authorization: Bearer <token>`, verifies the JWT, and attaches
 * the user to req. Does NOT reject if header is missing — that lets
 * public endpoints share the middleware. Use requireAuth to enforce.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const header = req.header('authorization');
    if (!header || !header.startsWith('Bearer ')) {
      return next();
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) return next();

    const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;

    const user = await User.findById(payload.sub).select('_id email').lean();
    if (!user) {
      throw ApiError.unauthorized('User no longer exists');
    }

    req.user = {
      id: user._id.toString(),
      _id: user._id,
      email: user.email,
    };
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError) {
      return next(ApiError.unauthorized('Invalid or expired token'));
    }
    next(err);
  }
}

/** Throws 401 if authenticate did not attach a user. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(ApiError.unauthorized());
  }
  next();
}
