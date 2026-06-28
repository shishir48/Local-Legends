import type { Request, Response, NextFunction } from 'express';
import * as gemService from '../services/gemService';
import { saveBuffer, saveFromUrl } from '../lib/imageStore';
import { googlePhotoUri } from '../lib/googlePhotos';
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

export async function followingFeed(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await gemService.listFollowingFeed(req.user!.id);
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
      const asset = saveBuffer(req.file.buffer);
      photoUrl = asset.url;
      photoPublicId = asset.publicId;
    }

    const gem = await gemService.createGem({
      ...input,
      photoUrl,
      photoPublicId,
      submittedBy: req.user!._id,
    });
    res.status(201).json(gem.toJSON());

    // Fire-and-forget: resolve Google photo and update gem later if no user photo
    if (!req.file && input.googlePhotoName) {
      googlePhotoUri(input.googlePhotoName).then((uri) => {
        if (!uri) return;
        saveFromUrl(uri).then((asset) => {
          if (!asset) return;
          gemService.updateGem(gem._id.toString(), req.user!.id, {
            photoUrl: asset.url,
            photoPublicId: asset.publicId,
          }).catch(() => {});
        });
      });
    }
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
      const asset = saveBuffer(req.file.buffer);
      photoOverride = { photoUrl: asset.url, photoPublicId: asset.publicId };
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
    await gemService.deleteGem(id, req.user!.id, req.user!.isAdmin);
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
