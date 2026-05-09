import type { Types } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        _id: Types.ObjectId;
        email: string;
      };
    }
  }
}

export {};
