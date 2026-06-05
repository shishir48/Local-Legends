import type { Request, Response, NextFunction } from 'express';
import * as pushTokenService from '../services/pushTokenService';
import { RegisterPushSchema, UnregisterPushSchema } from '../utils/validators';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, platform } = RegisterPushSchema.parse(req.body);
    await pushTokenService.registerToken(req.user!.id, token, platform);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function unregister(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = UnregisterPushSchema.parse(req.body);
    await pushTokenService.removeToken(token);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
