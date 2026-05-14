import { Router, type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { Log } from '../models/Log';
import { requireAuth } from '../middleware/authenticate';

const router = Router();

const logsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many log submissions' },
});

const LogEntrySchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'event']),
  message: z.string().min(1).max(1000),
  data: z.record(z.unknown()).optional(),
  userId: z.string().optional(),
  appVersion: z.string().max(20),
  platform: z.enum(['ios', 'android', 'web']),
  timestamp: z.string().datetime(),
});

const LogBatchSchema = z.object({
  logs: z.array(LogEntrySchema).min(1).max(50),
});

router.post('/', logsLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = LogBatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(200).json({ ok: true, dropped: req.body?.logs?.length ?? 0 });
      return;
    }

    const docs = parsed.data.logs.map((entry) => ({
      ...entry,
      timestamp: new Date(entry.timestamp),
    }));

    await Log.insertMany(docs, { ordered: false });
    res.status(200).json({ ok: true, saved: docs.length });
  } catch (err) {
    res.status(200).json({ ok: true });
  }
});

router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { level, userId, from, to, limit } = req.query;

    const filter: Record<string, unknown> = {};
    if (level) filter.level = level;
    if (userId) filter.userId = userId;
    if (from || to) {
      filter.timestamp = {};
      if (from) (filter.timestamp as Record<string, unknown>).$gte = new Date(from as string);
      if (to) (filter.timestamp as Record<string, unknown>).$lte = new Date(to as string);
    }

    const parsedLimit = Math.min(Number(limit) || 100, 500);

    const logs = await Log.find(filter)
      .sort({ timestamp: -1 })
      .limit(parsedLimit)
      .lean();

    res.json({ items: logs, count: logs.length });
  } catch (err) {
    next(err);
  }
});

export default router;
