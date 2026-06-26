import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import * as gemService from '../services/gemService';
import { ObjectIdSchema, UpdateProfileSchema } from '../utils/validators';

export async function listFollowers(req: Request, res: Response, next: NextFunction) {
  try {
    const id = ObjectIdSchema.parse(req.params.id);
    const user = await User.findById(id)
      .select('followers')
      .populate('followers', 'displayName avatarUrl')
      .lean();
    if (!user) throw ApiError.notFound('User not found');
    res.json({ items: user.followers ?? [] });
  } catch (err) {
    next(err);
  }
}

export async function listFollowing(req: Request, res: Response, next: NextFunction) {
  try {
    const id = ObjectIdSchema.parse(req.params.id);
    const user = await User.findById(id)
      .select('following')
      .populate('following', 'displayName avatarUrl')
      .lean();
    if (!user) throw ApiError.notFound('User not found');
    res.json({ items: user.following ?? [] });
  } catch (err) {
    next(err);
  }
}

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
    const user = await User.findById(id).select('displayName avatarUrl followers following');
    if (!user) throw ApiError.notFound('User not found');

    const isFollowing =
      req.user !== undefined &&
      (user.followers ?? []).some((u) => u.toString() === req.user!.id);

    const items = await gemService.listGemsBySubmitter(id);
    const totalUpvotes = items.reduce((sum, g) => sum + (g.voteCount ?? 0), 0);
    res.json({
      user: {
        id: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        followersCount: (user.followers ?? []).length,
        followingCount: (user.following ?? []).length,
      },
      isFollowing,
      items,
      totalUpvotes,
    });
  } catch (err) {
    next(err);
  }
}

export async function toggleFollow(req: Request, res: Response, next: NextFunction) {
  try {
    const targetId = ObjectIdSchema.parse(req.params.id);
    const userId = req.user!.id;

    if (targetId.toString() === userId) {
      throw ApiError.badRequest('Cannot follow yourself');
    }

    const target = await User.findById(targetId).select('_id');
    if (!target) throw ApiError.notFound('User not found');

    const userObjectId = new Types.ObjectId(userId);
    const targetObjectId = new Types.ObjectId(targetId);

    // Check if already following
    const me = await User.findById(userId).select('following');
    const isFollowing = (me?.following ?? []).some((u) => u.toString() === targetId);

    if (isFollowing) {
      await Promise.all([
        User.updateOne(
          { _id: userId },
          { $pull: { following: targetObjectId } },
        ),
        User.updateOne(
          { _id: targetId },
          { $pull: { followers: userObjectId } },
        ),
      ]);
    } else {
      await Promise.all([
        User.updateOne(
          { _id: userId },
          { $addToSet: { following: targetObjectId } },
        ),
        User.updateOne(
          { _id: targetId },
          { $addToSet: { followers: userObjectId } },
        ),
      ]);
    }

    const updatedTarget = await User.findById(targetId).select('followers');
    res.json({
      following: !isFollowing,
      followersCount: (updatedTarget?.followers ?? []).length,
    });
  } catch (err) {
    next(err);
  }
}
