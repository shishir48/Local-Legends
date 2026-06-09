import type { Request, Response, NextFunction } from 'express';
import { Comment } from '../models/Comment';
import { ObjectIdSchema } from '../utils/validators';
import { z } from 'zod';
import { ApiError } from '../utils/ApiError';

const CreateCommentSchema = z.object({
  text: z.string().min(1).max(500).trim(),
});

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const gemId = ObjectIdSchema.parse(req.params.gemId);
    const comments = await Comment.find({ gem: gemId })
      .sort({ createdAt: -1 })
      .populate('user', 'displayName avatarUrl')
      .lean();

    res.json({ items: comments.map((c) => ({ ...c, id: String(c._id) })) });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const gemId = ObjectIdSchema.parse(req.params.gemId);
    const { text } = CreateCommentSchema.parse(req.body);

    const comment = await Comment.create({
      gem: gemId,
      user: req.user!._id,
      text,
    });

    const populated = await comment.populate('user', 'displayName avatarUrl');
    res.status(201).json(populated.toJSON());
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const gemId = ObjectIdSchema.parse(req.params.gemId);
    const commentId = ObjectIdSchema.parse(req.params.commentId);

    const comment = await Comment.findOne({ _id: commentId, gem: gemId });
    if (!comment) throw ApiError.notFound('Comment not found');

    const userId = req.user!.id;
    const isAdmin = req.user!.isAdmin;
    if (comment.user.toString() !== userId && !isAdmin) {
      throw ApiError.forbidden('You can only delete your own comments');
    }

    await Comment.deleteOne({ _id: commentId });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}