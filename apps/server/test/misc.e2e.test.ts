import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import { app } from './helpers';

describe('GET /api/categories', () => {
  it('returns all categories with labels and emojis', async () => {
    const res = await request(app).get('/api/categories').expect(200);
    expect(res.body.items).toHaveLength(6);
    const food = res.body.items.find((c: { id: string }) => c.id === 'food');
    expect(food).toMatchObject({ id: 'food', label: 'Food' });
    expect(food.emoji).toBeTruthy();
  });
});

describe('GET /api/places/autocomplete', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('requires the input query param (400)', async () => {
    await request(app).get('/api/places/autocomplete').expect(400);
  });

  it('maps Nominatim results into predictions (fetch mocked)', async () => {
    const nominatim = [
      {
        osm_id: 123,
        display_name: 'Marina Beach, Chennai, Tamil Nadu, India',
        name: 'Marina Beach',
        address: { tourism: 'Marina Beach', road: 'Kamarajar Salai', suburb: 'Triplicane', city: 'Chennai Corporation' },
        lat: '13.05',
        lon: '80.28',
      },
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => nominatim }));

    const res = await request(app).get('/api/places/autocomplete').query({ input: 'marina' }).expect(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.predictions).toHaveLength(1);
    const p = res.body.predictions[0];
    expect(p.place_id).toBe('123');
    expect(p.detail.city).toBe('Chennai'); // "Corporation" suffix stripped
    expect(p.detail.lat).toBeCloseTo(13.05);
  });
});

describe('error + security middleware', () => {
  it('returns a 404 ApiError for unknown routes', async () => {
    const res = await request(app).get('/api/this-does-not-exist').expect(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('sets helmet security headers', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
