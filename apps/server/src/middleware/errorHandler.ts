import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError';
import { config } from '../lib/config';

interface ErrorBody {
  error: string;
  details?: unknown;
  stack?: string;
}

/**
 * Final error handler. Express identifies error middleware by its 4-arg
 * signature, so the unused `_next` parameter must stay.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  let status = 500;
  let body: ErrorBody = { error: 'Internal server error' };

  if (err instanceof ApiError) {
    status = err.status;
    body = { error: err.message, details: err.details };
  } else if (err instanceof ZodError) {
    status = 400;
    body = { error: 'Validation failed', details: err.flatten().fieldErrors };
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    body = { error: 'Validation failed', details: err.errors };
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    body = { error: `Invalid ${err.path}` };
  } else if ((err as { code?: number }).code === 11000) {
    // MongoDB duplicate key
    status = 409;
    body = { error: 'Duplicate key', details: (err as { keyValue?: unknown }).keyValue };
  } else if (err instanceof Error) {
    body = { error: err.message };
  }

  if (config.NODE_ENV !== 'production' && err instanceof Error) {
    body.stack = err.stack;
  }

  if (status >= 500) {
    console.error('[error]', err);
  }

  res.status(status).json(body);
}

/** 404 catcher — mounted after all routes. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route ${req.method} ${req.path} not found`));
}
