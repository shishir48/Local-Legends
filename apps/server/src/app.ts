import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './lib/config';
import { authenticate } from './middleware/authenticate';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth';
import gemRoutes from './routes/gems';
import userRoutes from './routes/users';
import categoryRoutes from './routes/categories';
import placesRoutes from './routes/places';
import logsRoutes from './routes/logs';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // honour X-Forwarded-For from reverse proxy / Cloudflare

  app.use(helmet());
  app.use(compression());

  app.use(
    cors({
      origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(','),
      credentials: false,
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Run authenticate on every request so req.user is populated where present.
  // Does not reject missing tokens; requireAuth does that on protected routes.
  app.use(authenticate);

  app.get('/health', (_req, res) => {
    res.json({ ok: true, env: config.NODE_ENV, time: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/gems', gemRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/places', placesRoutes);
  app.use('/api/logs', logsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
