import mongoose, { type Document, type Model } from 'mongoose';

export interface ILog extends Document {
  level: 'error' | 'warn' | 'info' | 'event';
  message: string;
  data?: Record<string, unknown>;
  userId?: string;
  appVersion: string;
  platform: 'ios' | 'android' | 'web';
  timestamp: Date;
  createdAt: Date;
}

const LogSchema = new mongoose.Schema<ILog>(
  {
    level: { type: String, enum: ['error', 'warn', 'info', 'event'], required: true },
    message: { type: String, required: true, maxlength: 1000 },
    data: { type: mongoose.Schema.Types.Mixed },
    userId: { type: String, index: true },
    appVersion: { type: String, required: true, maxlength: 20 },
    platform: { type: String, enum: ['ios', 'android', 'web'], required: true },
    timestamp: { type: Date, required: true, index: true },
  },
  {
    timestamps: true,
  }
);

// Auto-delete logs older than 30 days
LogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Reuse the compiled model if it already exists (test re-imports / hot reload).
export const Log: Model<ILog> =
  (mongoose.models.Log as Model<ILog>) || mongoose.model<ILog>('Log', LogSchema);
