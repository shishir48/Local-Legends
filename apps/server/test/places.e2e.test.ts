import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from './helpers';

// --- Nominatim fixtures ---
const LUCKNOW_GEOCODE = [
  { boundingbox: ['26.6', '27.0', '80.8', '81.1'], lat: '26.85', lon: '80.95' },
];
const NOMINATIM_BUSINESS = [
  {
    osm_id: 123,
    display_name: 'Sassy Canteen, Hazratganj, Lucknow, India',
    name: 'Sassy Canteen',
    address: { amenity: 'Sassy Canteen', road: 'MG Road', suburb: 'Hazratganj', city: 'Lucknow' },
    lat: '26.85',
    lon: '80.95',
  },
];

// --- Google fixtures ---
const GOOGLE_AUTOCOMPLETE_RES = {
  suggestions: [
    {
      placePrediction: {
        placeId: 'PLACE_123',
        structuredFormat: { mainText: { text: 'Tunday Kababi' }, secondaryText: { text: 'Aminabad, Lucknow' } },
      },
    },
    { queryPrediction: { text: { text: 'tunday' } } }, // non-place suggestion, should be filtered
  ],
};
const GOOGLE_DETAILS_RES = {
  displayName: { text: 'Tunday Kababi' },
  formattedAddress: 'Aminabad, Lucknow, Uttar Pradesh, India',
  location: { latitude: 26.85, longitude: 80.92 },
  googleMapsUri: 'https://maps.google.com/?cid=123',
  addressComponents: [
    { types: ['locality'], longText: 'Lucknow' },
    { types: ['administrative_area_level_1'], longText: 'Uttar Pradesh' },
  ],
};

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

function urlOf(input: string | URL | Request): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return (input as Request).url;
}

beforeEach(() => {
  delete process.env.GOOGLE_MAPS_API_KEY;
  fetchMock = vi.fn(async (input: string | URL) => {
    const url = urlOf(input);
    if (url.includes('nominatim')) {
      const limit = new URL(url).searchParams.get('limit');
      return jsonResponse(limit === '1' ? LUCKNOW_GEOCODE : NOMINATIM_BUSINESS);
    }
    if (url.includes('places:autocomplete')) return jsonResponse(GOOGLE_AUTOCOMPLETE_RES);
    if (url.includes('/v1/places/')) return jsonResponse(GOOGLE_DETAILS_RES);
    return jsonResponse([]);
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GOOGLE_MAPS_API_KEY;
});

function calls() {
  return fetchMock.mock.calls.map((c) => ({
    url: urlOf(c[0]),
    init: c[1] as RequestInit | undefined,
  }));
}

describe('GET /api/places/autocomplete — Nominatim fallback (no Google key)', () => {
  it('with no city: no viewbox/bounded', async () => {
    const res = await request(app).get('/api/places/autocomplete').query({ input: 'sassy' }).expect(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.predictions[0].detail).toBeTruthy(); // inline detail in fallback mode
    const ac = calls().find((c) => c.url.includes('nominatim') && new URL(c.url).searchParams.get('limit') === '8')!;
    expect(new URL(ac.url).searchParams.get('viewbox')).toBeNull();
  });

  it('with city: restricts to the city viewbox', async () => {
    const res = await request(app)
      .get('/api/places/autocomplete')
      .query({ input: 'sassy', city: 'Lucknow' })
      .expect(200);
    expect(res.body.status).toBe('OK');
    const ac = calls().find((c) => new URL(c.url).searchParams.get('limit') === '8')!;
    const u = new URL(ac.url);
    expect(u.searchParams.get('bounded')).toBe('1');
    expect(u.searchParams.get('viewbox')).toBe('80.8,27.0,81.1,26.6');
  });
});

describe('GET /api/places/autocomplete — Google path (key set)', () => {
  beforeEach(() => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
  });

  it('with city: posts a rectangle locationRestriction and maps suggestions', async () => {
    const res = await request(app)
      .get('/api/places/autocomplete')
      .query({ input: 'tun', city: 'Lucknow', session: 'sess-1' })
      .expect(200);

    expect(res.body.status).toBe('OK');
    expect(res.body.predictions).toHaveLength(1); // queryPrediction filtered out
    expect(res.body.predictions[0]).toEqual({
      place_id: 'PLACE_123',
      structured_formatting: { main_text: 'Tunday Kababi', secondary_text: 'Aminabad, Lucknow' },
    });

    const ac = calls().find((c) => c.url.includes('places:autocomplete'))!;
    expect(ac.init?.method).toBe('POST');
    const body = JSON.parse(ac.init!.body as string);
    expect(body.input).toBe('tun');
    expect(body.includedRegionCodes).toEqual(['in']);
    expect(body.sessionToken).toBe('sess-1');
    expect(body.locationRestriction.rectangle.low).toEqual({ latitude: 26.6, longitude: 80.8 });
    expect(body.locationRestriction.rectangle.high).toEqual({ latitude: 27.0, longitude: 81.1 });
  });

  it('with no city: omits locationRestriction but keeps region code', async () => {
    await request(app).get('/api/places/autocomplete').query({ input: 'tun' }).expect(200);
    const ac = calls().find((c) => c.url.includes('places:autocomplete'))!;
    const body = JSON.parse(ac.init!.body as string);
    expect(body.locationRestriction).toBeUndefined();
    expect(body.includedRegionCodes).toEqual(['in']);
  });

  it('falls back to Nominatim when the Google API errors (e.g. not enabled)', async () => {
    fetchMock.mockImplementation(async (input: string | URL) => {
      const url = urlOf(input);
      if (url.includes('places:autocomplete')) {
        return { ok: false, status: 403, json: async () => ({ error: {} }) } as unknown as Response;
      }
      if (url.includes('nominatim')) {
        const limit = new URL(url).searchParams.get('limit');
        return jsonResponse(limit === '1' ? LUCKNOW_GEOCODE : NOMINATIM_BUSINESS);
      }
      return jsonResponse([]);
    });

    const res = await request(app)
      .get('/api/places/autocomplete')
      .query({ input: 'sassy', city: 'Lucknow' })
      .expect(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.predictions[0].structured_formatting.main_text).toBe('Sassy Canteen');
    expect(res.body.predictions[0].detail).toBeTruthy(); // Nominatim inline detail
  });
});

describe('GET /api/places/details', () => {
  it('with no Google key returns 400', async () => {
    await request(app).get('/api/places/details').query({ place_id: 'X' }).expect(400);
  });

  it('with key maps Google details to the detail shape', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    const res = await request(app)
      .get('/api/places/details')
      .query({ place_id: 'PLACE_123', session: 'sess-1' })
      .expect(200);

    expect(res.body).toEqual({
      name: 'Tunday Kababi',
      address: 'Aminabad, Lucknow, Uttar Pradesh, India',
      city: 'Lucknow',
      lat: 26.85,
      lng: 80.92,
      mapsUrl: 'https://maps.google.com/?cid=123',
    });

    const det = calls().find((c) => c.url.includes('/v1/places/PLACE_123'))!;
    expect(det.url).toContain('sessionToken=sess-1');
    expect((det.init?.headers as Record<string, string>)['X-Goog-FieldMask']).toContain('location');
  });

  it('requires place_id', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    await request(app).get('/api/places/details').expect(400);
  });

  it('returns 502 when the Google details call errors', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    fetchMock.mockImplementation(async (input: string | URL) => {
      const url = urlOf(input);
      if (url.includes('/v1/places/')) {
        return { ok: false, status: 403, json: async () => ({ error: {} }) } as unknown as Response;
      }
      return jsonResponse([]);
    });
    await request(app).get('/api/places/details').query({ place_id: 'PLACE_123' }).expect(502);
  });
});
