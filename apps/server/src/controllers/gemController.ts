import type { Request, Response, NextFunction } from 'express';
import * as gemService from '../services/gemService';
import { uploadBufferToCloudinary } from '../lib/cloudinary';
import {
  CreateGemSchema,
  UpdateGemSchema,
  ListGemsQuerySchema,
  NearbyQuerySchema,
  ObjectIdSchema,
} from '../utils/validators';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = ListGemsQuerySchema.parse(req.query);
    const result = await gemService.listGems(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function nearby(req: Request, res: Response, next: NextFunction) {
  try {
    const { lat, lng, radius, limit } = NearbyQuerySchema.parse(req.query);
    const items = await gemService.findNearby({
      lat,
      lng,
      radiusKm: radius,
      limit,
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

export async function detail(req: Request, res: Response, next: NextFunction) {
  try {
    const id = ObjectIdSchema.parse(req.params.id);
    const gem = await gemService.getGemById(id, req.user?.id);
    res.json(gem);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateGemSchema.parse(req.body);

    let photoUrl: string | null = null;
    let photoPublicId: string | null = null;
    if (req.file) {
      const asset = await uploadBufferToCloudinary(req.file.buffer, req.file.originalname);
      if (asset) {
        photoUrl = asset.url;
        photoPublicId = asset.publicId;
      }
    }

    const gem = await gemService.createGem({
      ...input,
      photoUrl,
      photoPublicId,
      submittedBy: req.user!._id,
    });
    res.status(201).json(gem.toJSON());
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = ObjectIdSchema.parse(req.params.id);
    const patch = UpdateGemSchema.parse(req.body);

    let photoOverride: { photoUrl: string | null; photoPublicId: string | null } | null = null;
    if (req.file) {
      const asset = await uploadBufferToCloudinary(req.file.buffer, req.file.originalname);
      if (asset) {
        photoOverride = { photoUrl: asset.url, photoPublicId: asset.publicId };
      }
    }

    const result = await gemService.updateGem(id, req.user!.id, {
      ...patch,
      ...(photoOverride ?? {}),
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = ObjectIdSchema.parse(req.params.id);
    await gemService.deleteGem(id, req.user!.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function vote(req: Request, res: Response, next: NextFunction) {
  try {
    const id = ObjectIdSchema.parse(req.params.id);
    const result = await gemService.toggleVote(id, req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
