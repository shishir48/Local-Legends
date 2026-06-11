import { Schema, model, models, InferSchemaType, Types, type Model } from 'mongoose';

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
    city: { type: String, trim: true, lowercase: true, default: '', index: true },
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
    mapsUrl: { type: String, default: null },
    photoUrl: { type: String, default: null },
    photoPublicId: { type: String, default: null }, // stored image id, used to delete
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    voteCount: { type: Number, default: 0, index: true },
    // Highest vote milestone the submitter has already been pushed about, so
    // toggling votes across a threshold never re-fires the notification.
    notifiedVoteMilestone: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
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
type GemModel = Model<InferSchemaType<typeof GemSchema>>;
// Reuse the compiled model if it already exists (test re-imports / hot reload).
export const Gem = (models.Gem as GemModel) || model('Gem', GemSchema);
