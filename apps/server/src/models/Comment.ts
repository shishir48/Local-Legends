import { Schema, model, models, InferSchemaType, Types, type Model } from 'mongoose';

const CommentSchema = new Schema(
  {
    gem: { type: Schema.Types.ObjectId, ref: 'Gem', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 500, trim: true },
  },
  { timestamps: true }
);

CommentSchema.index({ gem: 1, createdAt: -1 });

CommentSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

export type CommentDoc = InferSchemaType<typeof CommentSchema> & { _id: Types.ObjectId };
type CommentModel = Model<InferSchemaType<typeof CommentSchema>>;
export const Comment = (models.Comment as CommentModel) || model('Comment', CommentSchema);