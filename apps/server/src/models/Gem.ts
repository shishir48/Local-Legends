import { Schema, model, InferSchemaType, Types } from 'mongoose';

export const GEM_CATEGORIES = ['food', 'nature', 'shop', 'bar', 'art', 'other'] as const;
export type GemCategory = (typeof GEM_CATEGORIES)[number];

const GemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    category: {
      type: String,
      required: true,
      enum: GEM_CATEGORIES,
    },
    description: { type: String, required: true, maxlength: 500, trim: true },
    address: { type: String, required: true, trim: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat] — GeoJSON order
        required: true,
        validate: {
          validator: (v: number[]) =>
            Array.isArray(v) &&
            v.length === 2 &&
            v[0] >= -180 && v[0] <= 180 &&
            v[1] >= -90 && v[1] <= 90,
          message: 'coordinates must be [lng, lat] within valid ranges',
        },
      },
    },
    photoUrl: { type: String, default: null },
    photoPublicId: { type: String, default: null }, // Cloudinary id, used to delete
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    voteCount: { type: Number, default: 0, index: true },
    votedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

GemSchema.index({ location: '2dsphere' });   // enables nearby/$near queries
GemSchema.index({ voteCount: -1 });           // fast leaderboard sort (desc)
GemSchema.index({ category: 1, voteCount: -1 }); // filter + sort combo

GemSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

export type GemDoc = InferSchemaType<typeof GemSchema> & { _id: Types.ObjectId };
export const Gem = model('Gem', GemSchema);
