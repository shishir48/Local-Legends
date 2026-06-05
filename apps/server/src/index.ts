import { createApp } from './app';
import { connectDB } from './lib/db';
import { config } from './lib/config';
import { ensureAdminUser } from './lib/ensureAdmin';
import { initPush } from './lib/push';

async function main() {
  await connectDB();
  await ensureAdminUser();
  initPush();
  const app = createApp();

  const server = app.listen(config.PORT, () => {
    console.log(`[server] listening on http://localhost:${config.PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(`[server] received ${signal}, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
