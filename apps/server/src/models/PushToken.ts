import { Schema, model, models, InferSchemaType, Types, type Model } from 'mongoose';

export const PUSH_PLATFORMS = ['android'] as const;
export type PushPlatform = (typeof PUSH_PLATFORMS)[number];

const PushTokenSchema = new Schema(
  {
    // Native FCM registration token. Unique so the same device maps to one row.
    token: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    platform: { type: String, enum: PUSH_PLATFORMS, required: true },
  },
  { timestamps: true }
);

PushTokenSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

export type PushTokenDoc = InferSchemaType<typeof PushTokenSchema> & { _id: Types.ObjectId };
type PushTokenModel = Model<InferSchemaType<typeof PushTokenSchema>>;
export const PushToken =
  (models.PushToken as PushTokenModel) || model('PushToken', PushTokenSchema);
