import { z } from 'zod';
import { Types } from 'mongoose';
import { GEM_CATEGORIES } from '../models/Gem';

export const ObjectIdSchema = z
  .string()
  .refine((v) => Types.ObjectId.isValid(v), { message: 'Invalid id' });

export const CreateGemSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  category: z.enum(GEM_CATEGORIES),
  description: z.string().min(1).max(500).trim(),
  address: z.string().min(1).max(200).trim(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export const UpdateGemSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  category: z.enum(GEM_CATEGORIES).optional(),
  description: z.string().min(1).max(500).trim().optional(),
  address: z.string().min(1).max(200).trim().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

export const ListGemsQuerySchema = z.object({
  category: z.enum(GEM_CATEGORIES).optional(),
  sort: z.enum(['votes', 'recent']).default('votes'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const NearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(0.1).max(50).default(5), // km
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).trim().optional(),
  avatarUrl: z.string().url().optional().nullable(),
});
