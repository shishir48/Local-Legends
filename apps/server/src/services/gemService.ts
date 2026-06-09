import { Types } from 'mongoose';
import { Gem } from '../models/Gem';
import { ApiError } from '../utils/ApiError';
import { deleteImage } from '../lib/imageStore';
import { sendToUser } from '../lib/push';

function withId<T extends { _id: unknown }>(doc: T) {
  const c = (doc as Record<string, unknown>).commentCount;
  return { ...doc, id: String(doc._id), commentCount: typeof c === 'number' ? c : 0 };
}

// Vote counts at which a gem's submitter gets a milestone push.
const VOTE_MILESTONES = [1, 10, 25, 50, 100, 250, 500, 1000];

/** Highest milestone <= voteCount that's above what was already notified, or null. */
export function highestMilestoneReached(voteCount: number, alreadyNotified: number): number | null {
  let best: number | null = null;
  for (const m of VOTE_MILESTONES) {
    if (m <= voteCount && m > alreadyNotified) best = m;
  }
  return best;
}

/**
 * Notify a gem's submitter when a vote milestone is crossed. The conditional
 * bump of notifiedVoteMilestone is awaited (deterministic + concurrent votes
 * claim a milestone at most once); the actual push send is fire-and-forget so
 * it never blocks or fails the vote. Self-votes never notify.
 */
async function notifyMilestone(args: {
  gemId: string;
  gemName: string;
  submitterId: string;
  voterId: string;
  voteCount: number;
  alreadyNotified: number;
}): Promise<void> {
  const target = highestMilestoneReached(args.voteCount, args.alreadyNotified);
  if (!target || args.submitterId === args.voterId) return;

  // Only one concurrent vote whose filter still matches wins the claim.
  const won = await Gem.findOneAndUpdate(
    { _id: args.gemId, notifiedVoteMilestone: { $lt: target } },
    { $set: { notifiedVoteMilestone: target } }
  );
  if (!won) return;

  // Fire-and-forget — a push outage must not affect voting.
  const noun = target === 1 ? 'upvote' : 'upvotes';
  sendToUser(args.submitterId, {
    title: 'Your gem is on fire 🔥',
    body: `${args.gemName} just hit ${target} ${noun}!`,
    data: { type: 'gem_milestone', gemId: args.gemId },
  }).catch((err) => console.warn('[push] milestone notify failed:', (err as Error).message));
}

interface ListOptions {
  category?: string;
  city?: string;
  sort: 'votes' | 'recent';
  page: number;
  limit: number;
}

export async function listGems(opts: ListOptions) {
  const filter: Record<string, unknown> = { isDeleted: false };
  if (opts.category) filter.category = opts.category;
  if (opts.city) filter.city = { $regex: new RegExp(`^${opts.city}$`, 'i') };

  const sortSpec: Record<string, 1 | -1> =
    opts.sort === 'recent' ? { createdAt: -1 } : { voteCount: -1 };

  const skip = (opts.page - 1) * opts.limit;

  const [items, total] = await Promise.all([
    Gem.find(filter)
      .sort(sortSpec)
      .skip(skip)
      .limit(opts.limit)
      .populate('submittedBy', 'displayName avatarUrl')
      .lean(),
    Gem.countDocuments(filter),
  ]);

  return {
    items: items.map(withId),
    page: opts.page,
    limit: opts.limit,
    total,
    pages: Math.max(1, Math.ceil(total / opts.limit)),
  };
}

interface NearbyOptions {
  lat: number;
  lng: number;
  radiusKm: number;
  limit: number;
}

export async function findNearby(opts: NearbyOptions) {
  const items = await Gem.find({
    isDeleted: false,
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [opts.lng, opts.lat] },
        $maxDistance: opts.radiusKm * 1000, // metres
      },
    },
  })
    .limit(opts.limit)
    .populate('submittedBy', 'displayName avatarUrl')
    .lean();
  return items.map(withId);
}

export async function getGemById(id: string, viewerId?: string) {
  const gem = await Gem.findOne({ _id: id, isDeleted: false })
    .populate('submittedBy', 'displayName avatarUrl')
    .lean();
  if (!gem) throw ApiError.notFound('Gem not found');

  const hasVoted =
    viewerId !== undefined &&
    gem.votedBy.some((u) => u.toString() === viewerId);

  return { ...withId(gem), hasVoted };
}

interface CreateGemInput {
  name: string;
  category: string;
  description: string;
  address: string;
  city: string;
  mapsUrl?: string | null;
  lat: number;
  lng: number;
  photoUrl?: string | null;
  photoPublicId?: string | null;
  submittedBy: Types.ObjectId;
}

export async function createGem(input: CreateGemInput) {
  return Gem.create({
    name: input.name,
    category: input.category,
    description: input.description,
    address: input.address,
    city: input.city,
    mapsUrl: input.mapsUrl ?? null,
    location: { type: 'Point', coordinates: [input.lng, input.lat] },
    photoUrl: input.photoUrl ?? null,
    photoPublicId: input.photoPublicId ?? null,
    submittedBy: input.submittedBy,
  });
}

interface UpdateGemPatch {
  name?: string;
  category?: string;
  description?: string;
  address?: string;
  city?: string;
  mapsUrl?: string | null;
  lat?: number;
  lng?: number;
  photoUrl?: string | null;
  photoPublicId?: string | null;
}

export async function updateGem(
  id: string,
  userId: string,
  patch: UpdateGemPatch
) {
  const gem = await Gem.findOne({ _id: id, isDeleted: false });
  if (!gem) throw ApiError.notFound('Gem not found');
  if (gem.submittedBy.toString() !== userId) {
    throw ApiError.forbidden('You can only edit your own gems');
  }

  if (patch.name !== undefined) gem.name = patch.name;
  if (patch.category !== undefined) gem.category = patch.category as typeof gem.category;
  if (patch.description !== undefined) gem.description = patch.description;
  if (patch.address !== undefined) gem.address = patch.address;
  if (patch.city !== undefined) gem.city = patch.city;
  if (patch.mapsUrl !== undefined) gem.mapsUrl = patch.mapsUrl;
  if (patch.lat !== undefined && patch.lng !== undefined) {
    gem.location = { type: 'Point', coordinates: [patch.lng, patch.lat] };
  }

  if (patch.photoUrl !== undefined) {
    if (gem.photoPublicId) {
      deleteImage(gem.photoPublicId);
    }
    gem.photoUrl = patch.photoUrl;
    gem.photoPublicId = patch.photoPublicId ?? null;
  }

  await gem.save();
  return { ...gem.toJSON(), commentCount: gem.commentCount ?? 0 };
}

export async function deleteGem(id: string, userId: string, isAdmin = false) {
  const gem = await Gem.findOne({ _id: id, isDeleted: false });
  if (!gem) throw ApiError.notFound('Gem not found');
  // Admins can delete any gem; everyone else only their own.
  if (!isAdmin && gem.submittedBy.toString() !== userId) {
    throw ApiError.forbidden('You can only delete your own gems');
  }
  gem.isDeleted = true;
  await gem.save();
  if (gem.photoPublicId) deleteImage(gem.photoPublicId);
  return { ok: true };
}

export async function toggleVote(gemId: string, userId: string) {
  const gem = await Gem.findOne({ _id: gemId, isDeleted: false }).select('_id votedBy');
  if (!gem) throw ApiError.notFound('Gem not found');

  const userObjectId = new Types.ObjectId(userId);
  const hasVoted = gem.votedBy.some((u) => u.toString() === userId);

  // Conditional atomic updates keep voteCount in lockstep with votedBy. The
  // membership filter ($ne / equality) means concurrent duplicate toggles
  // match at most once, so $inc can never double-count (voteCount drift).
  if (hasVoted) {
    const updated = await Gem.findOneAndUpdate(
      { _id: gemId, votedBy: userObjectId },
      { $pull: { votedBy: userObjectId }, $inc: { voteCount: -1 } },
      { new: true }
    ).select('voteCount');
    if (updated) return { voted: false, voteCount: updated.voteCount };
  } else {
    const updated = await Gem.findOneAndUpdate(
      { _id: gemId, votedBy: { $ne: userObjectId } },
      { $addToSet: { votedBy: userObjectId }, $inc: { voteCount: 1 } },
      { new: true }
    ).select('voteCount name submittedBy notifiedVoteMilestone');
    if (updated) {
      await notifyMilestone({
        gemId,
        gemName: updated.name,
        submitterId: updated.submittedBy.toString(),
        voterId: userId,
        voteCount: updated.voteCount,
        alreadyNotified: updated.notifiedVoteMilestone ?? 0,
      });
      return { voted: true, voteCount: updated.voteCount };
    }
  }

  // Lost the race (state already changed under us): report the live state.
  const current = await Gem.findById(gemId).select('voteCount votedBy');
  const voted = current?.votedBy.some((u) => u.toString() === userId) ?? false;
  return { voted, voteCount: current?.voteCount ?? 0 };
}

export async function listGemsBySubmitter(userId: string) {
  const items = await Gem.find({ submittedBy: userId, isDeleted: false })
    .sort({ createdAt: -1 })
    .lean();
  return items.map(withId);
}
