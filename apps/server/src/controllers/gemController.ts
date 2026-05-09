import type { Request, Response, NextFunction } from 'express';
import * as gemService from '../services/gemService';
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
    const file = req.file as Express.Multer.File & {
      path?: string;
      filename?: string;
    } | undefined;

    const gem = await gemService.createGem({
      ...input,
      photoUrl: file?.path ?? null,
      photoPublicId: file?.filename ?? null,
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
    const file = req.file as Express.Multer.File & {
      path?: string;
      filename?: string;
    } | undefined;

    const result = await gemService.updateGem(id, req.user!.id, {
      ...patch,
      ...(file
        ? { photoUrl: file.path ?? null, photoPublicId: file.filename ?? null }
        : {}),
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
