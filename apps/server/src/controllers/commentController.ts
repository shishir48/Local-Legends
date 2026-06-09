import type { Request, Response, NextFunction } from 'express';
import { Comment } from '../models/Comment';
import { Gem } from '../models/Gem';
import { User } from '../models/User';
import { ObjectIdSchema } from '../utils/validators';
import { z } from 'zod';
import { ApiError } from '../utils/ApiError';
import { sendToUser } from '../lib/push';

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

    // Fire-and-forget — never block or fail the comment on a push outage.
    // Self-comments never notify.
    notifyCommenter({
      gemId,
      commentId: String(comment._id),
      commenterId: req.user!.id,
      commentText: text,
    }).catch((err) => console.warn('[push] comment notify failed:', (err as Error).message));

    res.status(201).json(populated.toJSON());
  } catch (err) {
    next(err);
  }
}

async function notifyCommenter(args: {
  gemId: string;
  commentId: string;
  commenterId: string;
  commentText: string;
}): Promise<void> {
  const gem = await Gem.findById(args.gemId).select('name submittedBy isDeleted').lean();
  if (!gem || gem.isDeleted) return;

  const submitterId = gem.submittedBy.toString();
  if (submitterId === args.commenterId) return; // self-comment

  // Fetch commenter's display name for a friendlier notification body.
  const commenter = await User.findById(args.commenterId).select('displayName').lean();
  const name = commenter?.displayName ?? 'Someone';

  // Truncate long comments so the body fits the OS notification.
  const snippet = args.commentText.length > 80
    ? args.commentText.slice(0, 77) + '…'
    : args.commentText;

  await sendToUser(submitterId, {
    title: `💬 ${gem.name} got a new comment`,
    body: `${name}: ${snippet}`,
    data: { type: 'gem_comment', gemId: args.gemId, commentId: args.commentId },
  });
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