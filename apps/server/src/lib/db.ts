import mongoose from 'mongoose';
import { config } from './config';

export async function connectDB(): Promise<void> {
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(config.MONGO_URI);
    console.log('[db] connected to MongoDB');
  } catch (err) {
    console.error('[db] connection error:', err);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] disconnected');
  });
}
