import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './helpers';
import { saveBuffer, deleteImage, readImage } from '../src/lib/imageStore';

// Minimal valid PNG header bytes for content-type sniffing.
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

describe('imageStore', () => {
  it('saveBuffer stores bytes and returns an extension-less /api/photo URL', async () => {
    const asset = saveBuffer(PNG);
    expect(asset.publicId).toMatch(/^[a-f0-9-]{36}$/);
    expect(asset.url).toContain('/api/photo/');
    expect(asset.url).not.toMatch(/\.(jpg|png|jpeg|webp)$/); // no extension → nginx-safe
    expect(readImage(asset.publicId)?.contentType).toBe('image/png');
    deleteImage(asset.publicId);
    await new Promise((r) => setTimeout(r, 30)); // unlink is async best-effort
    expect(readImage(asset.publicId)).toBeNull();
  });

  it('readImage rejects traversal / bad ids', () => {
    expect(readImage('../../etc/passwd')).toBeNull();
    expect(readImage('nope')).toBeNull();
  });
});

describe('GET /api/photo/:id', () => {
  it('streams a stored photo with its content-type', async () => {
    const asset = saveBuffer(PNG);
    const res = await request(app).get(`/api/photo/${asset.publicId}`).expect(200);
    expect(res.headers['content-type']).toContain('image/png');
    deleteImage(asset.publicId);
  });

  it('404s for a missing photo', async () => {
    await request(app).get('/api/photo/00000000-0000-0000-0000-000000000000').expect(404);
  });
});
