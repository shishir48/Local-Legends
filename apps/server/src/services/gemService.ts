import { Types } from 'mongoose';
import { Gem } from '../models/Gem';
import { ApiError } from '../utils/ApiError';
import { deleteCloudinaryAsset } from '../lib/cloudinary';

function withId<T extends { _id: unknown }>(doc: T) {
  return { ...doc, id: String(doc._id) };
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
  if (patch.lat !== undefined && patch.lng !== undefined) {
    gem.location = { type: 'Point', coordinates: [patch.lng, patch.lat] };
  }

  if (patch.photoUrl !== undefined) {
    if (gem.photoPublicId) {
      await deleteCloudinaryAsset(gem.photoPublicId);
    }
    gem.photoUrl = patch.photoUrl;
    gem.photoPublicId = patch.photoPublicId ?? null;
  }

  await gem.save();
  return gem.toJSON();
}

export async function deleteGem(id: string, userId: string) {
  const gem = await Gem.findOne({ _id: id, isDeleted: false });
  if (!gem) throw ApiError.notFound('Gem not found');
  if (gem.submittedBy.toString() !== userId) {
    throw ApiError.forbidden('You can only delete your own gems');
  }
  gem.isDeleted = true;
  await gem.save();
  if (gem.photoPublicId) await deleteCloudinaryAsset(gem.photoPublicId);
  return { ok: true };
}

export async function toggleVote(gemId: string, userId: string) {
  const gem = await Gem.findOne({ _id: gemId, isDeleted: false }).select(
    '_id votedBy voteCount'
  );
  if (!gem) throw ApiError.notFound('Gem not found');

  const userObjectId = new Types.ObjectId(userId);
  const hasVoted = gem.votedBy.some((u) => u.toString() === userId);

  if (hasVoted) {
    const updated = await Gem.findByIdAndUpdate(
      gemId,
      { $pull: { votedBy: userObjectId }, $inc: { voteCount: -1 } },
      { new: true }
    ).select('voteCount');
    return { voted: false, voteCount: updated?.voteCount ?? gem.voteCount - 1 };
  }

  const updated = await Gem.findByIdAndUpdate(
    gemId,
    { $addToSet: { votedBy: userObjectId }, $inc: { voteCount: 1 } },
    { new: true }
  ).select('voteCount');
  return { voted: true, voteCount: updated?.voteCount ?? gem.voteCount + 1 };
}

export async function listGemsBySubmitter(userId: string) {
  const items = await Gem.find({ submittedBy: userId, isDeleted: false })
    .sort({ createdAt: -1 })
    .lean();
  return items.map(withId);
}
