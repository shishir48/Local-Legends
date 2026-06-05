import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import multer from 'multer';
import { config } from './config';

// Photos live on the droplet's disk and are streamed back through the API at
// /api/photo/<id>. The URL deliberately has NO image extension so nginx's
// `location ~* \.(jpg|png|...)$` static rule never intercepts it — every
// /api/* path is proxied to this server. Deploys only rsync `dist/`, so this
// directory persists across deploys.
const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');
const GEMS_DIR = path.join(UPLOADS_ROOT, 'gems');

fs.mkdirSync(GEMS_DIR, { recursive: true });

export interface UploadedAsset {
  url: string; // absolute, public (extension-less)
  publicId: string; // the file id (uuid), used to read/delete
}

const ID_RE = /^[a-f0-9-]{16,40}$/i; // uuid-ish, no slashes/dots → no traversal

function publicUrl(id: string): string {
  return `${config.PUBLIC_BASE_URL.replace(/\/$/, '')}/api/photo/${id}`;
}

/** Persist an in-memory image buffer; returns its public URL + id. */
export function saveBuffer(buffer: Buffer): UploadedAsset {
  const id = randomUUID();
  fs.writeFileSync(path.join(GEMS_DIR, id), buffer);
  return { url: publicUrl(id), publicId: id };
}

/** Download a remote image URL and store it locally. Null on any failure. */
export async function saveFromUrl(remoteUrl: string): Promise<UploadedAsset | null> {
  try {
    const resp = await fetch(remoteUrl);
    if (!resp.ok) return null;
    return saveBuffer(Buffer.from(await resp.arrayBuffer()));
  } catch {
    return null;
  }
}

/** Delete a stored image by id. Best-effort. */
export function deleteImage(id: string | null | undefined): void {
  if (!id || !ID_RE.test(id)) return;
  fs.promises.unlink(path.join(GEMS_DIR, id)).catch(() => {});
}

/** Sniff the image content-type from magic bytes (defaults to jpeg). */
function sniffMime(buf: Buffer): string {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50) return 'image/png';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP')
    return 'image/webp';
  if (buf.length >= 4 && buf.toString('ascii', 0, 3) === 'GIF') return 'image/gif';
  return 'image/jpeg';
}

/** Read a stored image by id → bytes + content-type, or null if missing. */
export function readImage(id: string): { buffer: Buffer; contentType: string } | null {
  if (!ID_RE.test(id)) return null;
  const full = path.join(GEMS_DIR, id);
  if (!fs.existsSync(full)) return null;
  const buffer = fs.readFileSync(full);
  return { buffer, contentType: sniffMime(buffer) };
}

// Photos arrive in memory, then we write them to disk in the route handler.
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
