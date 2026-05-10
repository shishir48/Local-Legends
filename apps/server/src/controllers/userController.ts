import type { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Gem } from '../models/Gem';
import { ApiError } from '../utils/ApiError';
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
    const raw = await Gem.find({ submittedBy: id, isDeleted: false })
      .sort({ createdAt: -1 })
      .lean();

    const totalUpvotes = raw.reduce((sum, g) => sum + (g.voteCount ?? 0), 0);
    const items = raw.map((g) => ({ ...g, id: String(g._id) }));

    res.json({ items, totalUpvotes });
  } catch (err) {
    next(err);
  }
}
