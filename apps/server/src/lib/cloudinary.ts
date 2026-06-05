import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import multer from 'multer';
import { config } from './config';

const cloudinaryConfigured = Boolean(
  config.CLOUDINARY_CLOUD_NAME &&
    config.CLOUDINARY_API_KEY &&
    config.CLOUDINARY_API_SECRET
);

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

// Photos arrive in memory, then we stream them to Cloudinary in the
// route handler. Memory is bounded by the 5MB fileSize limit below.
export const uploadGemPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  },
}).single('photo');

export interface UploadedAsset {
  url: string;
  publicId: string;
}

export async function uploadBufferToCloudinary(
  buffer: Buffer,
  filename: string
): Promise<UploadedAsset | null> {
  if (!cloudinaryConfigured) return null;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'local-legend/gems',
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 1600, height: 1600, crop: 'limit' }],
        public_id: filename.replace(/\.[^/.]+$/, ''),
        use_filename: true,
        unique_filename: true,
      },
      (err, result?: UploadApiResponse) => {
        if (err || !result) return reject(err ?? new Error('Cloudinary upload failed'));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

/** Upload a remote image URL straight to Cloudinary (it fetches the URL). */
export async function uploadUrlToCloudinary(url: string): Promise<UploadedAsset | null> {
  if (!cloudinaryConfigured) return null;
  try {
    const result = await cloudinary.uploader.upload(url, {
      folder: 'local-legend/gems',
      resource_type: 'image',
      transformation: [{ width: 1600, height: 1600, crop: 'limit' }],
      unique_filename: true,
    });
    return { url: result.secure_url, publicId: result.public_id };
  } catch (err) {
    console.warn('[cloudinary] failed to upload from url', err);
    return null;
  }
}

export async function deleteCloudinaryAsset(publicId: string | null | undefined) {
  if (!publicId || !cloudinaryConfigured) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn('[cloudinary] failed to delete', publicId, err);
  }
}

export { cloudinary, cloudinaryConfigured };
