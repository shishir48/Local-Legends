import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { uploadGemPhoto as multerHandler } from '../lib/imageStore';
import { ApiError } from '../utils/ApiError';

/**
 * Wraps multer so errors flow through our ApiError pipeline instead of
 * leaking multer's raw messages to clients.
 */
export function uploadGemPhoto(req: Request, res: Response, next: NextFunction) {
  multerHandler(req, res, (err: unknown) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(ApiError.badRequest('Photo must be 5MB or less'));
      }
      return next(ApiError.badRequest(err.message));
    }
    if (err instanceof Error) {
      return next(ApiError.badRequest(err.message));
    }
    next(err);
  });
}
