import mongoose from 'mongoose';
import { config } from './config';

// Retry the initial connection with capped exponential backoff instead of
// exiting the process. Exiting on a transient Atlas blip made pm2 restart the
// app immediately and forever (a hammer-loop). Here the server only starts
// once Mongo is reachable, and a later drop is handled by the driver's own
// auto-reconnect — so a brief outage no longer crash-loops the process.
const RETRY_BASE_MS = 1_000;
const RETRY_MAX_MS = 30_000;

function wireConnectionEvents(): void {
  const conn = mongoose.connection;
  conn.on('disconnected', () => console.warn('[db] disconnected — driver will auto-reconnect'));
  conn.on('reconnected', () => console.log('[db] reconnected'));
  conn.on('error', (err) => console.error('[db] connection error:', err.message));
}

export async function connectDB(): Promise<void> {
  mongoose.set('strictQuery', true);
  wireConnectionEvents();

  let attempt = 0;
  // Loop until the first successful connection; back off between tries.
  for (;;) {
    try {
      await mongoose.connect(config.MONGO_URI, {
        serverSelectionTimeoutMS: 10_000,
      });
      console.log('[db] connected to MongoDB');
      return;
    } catch (err) {
      attempt += 1;
      const delay = Math.min(RETRY_BASE_MS * 2 ** (attempt - 1), RETRY_MAX_MS);
      const reason = err instanceof Error ? err.message : String(err);
      console.error(`[db] connect attempt ${attempt} failed (${reason}); retrying in ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
