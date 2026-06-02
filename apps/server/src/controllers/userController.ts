import type { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import * as gemService from '../services/gemService';
import { ObjectIdSchema, UpdateProfileSchema } from '../utils/validators';

export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const patch = UpdateProfileSchema.parse(req.body);
    const user = await User.findByIdAndUpdate(req.user!.id, patch, {
      new: true,
      runValidators: true,
    });
    if (!user) throw ApiError.notFound('User not found');
    res.json(user.toJSON());
  } catch (err) {
    next(err);
  }
}

export async function gemsBySubmitter(req: Request, res: Response, next: NextFunction) {
  try {
    const id = ObjectIdSchema.parse(req.params.id);
    const items = await gemService.listGemsBySubmitter(id);
    const totalUpvotes = items.reduce((sum, g) => sum + (g.voteCount ?? 0), 0);
    res.json({ items, totalUpvotes });
  } catch (err) {
    next(err);
  }
}
