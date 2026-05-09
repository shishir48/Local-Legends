import { Router } from 'express';
import { GEM_CATEGORIES } from '../models/Gem';

const router = Router();

const CATEGORY_META: Record<string, { label: string; emoji: string }> = {
  food:   { label: 'Food',   emoji: '🍜' },
  nature: { label: 'Nature', emoji: '🌿' },
  shop:   { label: 'Shop',   emoji: '🛍️' },
  bar:    { label: 'Bar',    emoji: '🍸' },
  art:    { label: 'Art',    emoji: '🎨' },
  other:  { label: 'Other',  emoji: '✨' },
};

router.get('/', (_req, res) => {
  res.json({
    items: GEM_CATEGORIES.map((id) => ({ id, ...CATEGORY_META[id] })),
  });
});

export default router;
