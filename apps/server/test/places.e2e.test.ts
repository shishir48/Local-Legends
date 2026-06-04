import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from './helpers';

// Nominatim geocode result for a city lookup (boundingbox = [south, north, west, east]).
const LUCKNOW_GEOCODE = [
  { boundingbox: ['26.6', '27.0', '80.8', '81.1'], lat: '26.85', lon: '80.95' },
];

// Nominatim autocomplete result for a business search.
const BUSINESS_RESULTS = [
  {
    osm_id: 123,
    display_name: 'Sassy Canteen, Hazratganj, Lucknow, India',
    name: 'Sassy Canteen',
    address: { amenity: 'Sassy Canteen', road: 'MG Road', suburb: 'Hazratganj', city: 'Lucknow' },
    lat: '26.85',
    lon: '80.95',
  },
];

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body } as unknown as Response;
}

/** Classify a Nominatim request URL: 'geocode' (city lookup) vs 'autocomplete' (business). */
function kindOf(url: string): 'geocode' | 'autocomplete' {
  return new URL(url).searchParams.get('limit') === '1' ? 'geocode' : 'autocomplete';
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async (input: string | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    return kindOf(url) === 'geocode' ? jsonResponse(LUCKNOW_GEOCODE) : jsonResponse(BUSINESS_RESULTS);
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Return the captured fetch URLs split by kind. */
function captured() {
  const urls = fetchMock.mock.calls.map((c) => (typeof c[0] === 'string' ? c[0] : c[0].toString()));
  return {
    geocodes: urls.filter((u) => kindOf(u) === 'geocode'),
    autocompletes: urls.filter((u) => kindOf(u) === 'autocomplete'),
  };
}

describe('GET /api/places/autocomplete', () => {
  it('with no city: no viewbox/bounded, behaves as before', async () => {
    const res = await request(app).get('/api/places/autocomplete').query({ input: 'sassy' }).expect(200);
    expect(res.body.status).toBe('OK');

    const { geocodes, autocompletes } = captured();
    expect(geocodes.length).toBe(0);
    expect(autocompletes.length).toBe(1);
    const ac = new URL(autocompletes[0]);
    expect(ac.searchParams.get('viewbox')).toBeNull();
    expect(ac.searchParams.get('bounded')).toBeNull();
  });

  it('with city: geocodes the city then restricts autocomplete to its viewbox', async () => {
    const res = await request(app)
      .get('/api/places/autocomplete')
      .query({ input: 'sassy', city: 'Lucknow' })
      .expect(200);
    expect(res.body.status).toBe('OK');

    const { geocodes, autocompletes } = captured();
    expect(geocodes.length).toBe(1);
    expect(autocompletes.length).toBe(1);

    const ac = new URL(autocompletes[0]);
    expect(ac.searchParams.get('bounded')).toBe('1');
    // viewbox order is west,north,east,south = bbox[2],bbox[1],bbox[3],bbox[0]
    expect(ac.searchParams.get('viewbox')).toBe('80.8,27.0,81.1,26.6');
  });

  it('caches the city geocode across requests (no repeat lookup)', async () => {
    await request(app).get('/api/places/autocomplete').query({ input: 'a', city: 'Kanpur' }).expect(200);
    await request(app).get('/api/places/autocomplete').query({ input: 'b', city: 'Kanpur' }).expect(200);

    const { geocodes } = captured();
    expect(geocodes.length).toBe(1); // only one geocode for two same-city searches
  });

  it('falls back to global search when the city geocode returns nothing', async () => {
    fetchMock.mockImplementation(async (input: string | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      return kindOf(url) === 'geocode' ? jsonResponse([]) : jsonResponse(BUSINESS_RESULTS);
    });

    const res = await request(app)
      .get('/api/places/autocomplete')
      .query({ input: 'sassy', city: 'Nowhereville' })
      .expect(200);
    expect(res.body.status).toBe('OK');

    const { autocompletes } = captured();
    expect(autocompletes.length).toBe(1);
    const ac = new URL(autocompletes[0]);
    expect(ac.searchParams.get('viewbox')).toBeNull();
    expect(ac.searchParams.get('bounded')).toBeNull();
  });
});
