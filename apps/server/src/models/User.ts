import { Schema, model, models, InferSchemaType, Types, type Model } from 'mongoose';

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true, trim: true, maxlength: 50 },
    avatarUrl: { type: String, default: null },
    isAdmin: { type: Boolean, default: false },
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    resetCodeHash: { type: String, default: null },
    resetCodeExpires: { type: Date, default: null },
    resetAttempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Strip sensitive fields when converting to JSON.
UserSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.passwordHash;
    delete ret.resetCodeHash;
    delete ret.resetCodeExpires;
    delete ret.resetAttempts;
    return ret;
  },
});

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: Types.ObjectId };
type UserModel = Model<InferSchemaType<typeof UserSchema>>;
// Reuse the compiled model if it already exists (test re-imports / hot reload).
export const User = (models.User as UserModel) || model('User', UserSchema);
