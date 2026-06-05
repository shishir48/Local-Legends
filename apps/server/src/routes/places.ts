import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

const router = Router();

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const GOOGLE_AUTOCOMPLETE = 'https://places.googleapis.com/v1/places:autocomplete';
const GOOGLE_DETAILS_BASE = 'https://places.googleapis.com/v1/places/';
const UA = 'LocalLegend/1.0 (demo app)';
const FETCH_TIMEOUT_MS = 5_000;

// Read the key at request time (not from the frozen config object) so it picks
// up dotenv-populated env and is easy to toggle in tests. Empty → undefined.
function googleKey(): string | undefined {
  return process.env.GOOGLE_MAPS_API_KEY?.trim() || undefined;
}

// Nominatim's usage policy caps callers at ~1 req/s. Throttle hard so this
// open proxy can't be abused to hammer (and get us banned from) Nominatim.
const placesLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many search requests, slow down' },
});

const CITY_SUFFIXES = /\s+(city\s+district|municipal\s+corporation|corporation|district|urban)\s*$/i;

// A gem is a specific place (business / POI), never a whole city, region or
// country. These Google place types describe an area rather than a venue, so
// any prediction carrying one of them is dropped from the suggestions.
const GOOGLE_REGION_TYPES = new Set([
  'locality',
  'sublocality',
  'sublocality_level_1',
  'sublocality_level_2',
  'neighborhood',
  'administrative_area_level_1',
  'administrative_area_level_2',
  'administrative_area_level_3',
  'administrative_area_level_4',
  'administrative_area_level_5',
  'colloquial_area',
  'country',
  'political',
  'postal_code',
  'postal_code_prefix',
  'plus_code',
]);

function isGoogleRegion(types: string[] = []): boolean {
  return types.some((t) => GOOGLE_REGION_TYPES.has(t));
}

// Nominatim returns class/type for each hit. `boundary` rows are admin areas,
// and `place`-class rows of these types are cities/regions — not venues. Other
// place types (e.g. house) and POI classes (amenity/shop/tourism/…) stay.
const NOMINATIM_REGION_PLACE_TYPES = new Set([
  'city',
  'town',
  'village',
  'hamlet',
  'suburb',
  'neighbourhood',
  'quarter',
  'locality',
  'municipality',
  'county',
  'district',
  'region',
  'province',
  'state',
  'state_district',
  'country',
  'continent',
]);

function isNominatimRegion(klass?: string, type?: string): boolean {
  if (klass === 'boundary') return true;
  if (klass === 'place' && type && NOMINATIM_REGION_PLACE_TYPES.has(type)) return true;
  return false;
}

function cleanCityName(s: string): string {
  return s.replace(CITY_SUFFIXES, '').trim();
}

interface PlaceDetail {
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  mapsUrl: string;
  photoName?: string;
}

interface Prediction {
  place_id: string;
  structured_formatting: { main_text: string; secondary_text: string };
  detail?: PlaceDetail;
}

// Cache of city name → Nominatim viewbox string (or null when unresolvable).
// The city list is small and static, so each city is geocoded at most once.
const cityViewboxCache = new Map<string, string | null>();

/**
 * Resolve a city name to a Nominatim `viewbox` string ("west,north,east,south").
 * Returns null when the city can't be geocoded — callers then search globally.
 */
async function getCityViewbox(city: string): Promise<string | null> {
  const key = city.trim().toLowerCase();
  if (cityViewboxCache.has(key)) return cityViewboxCache.get(key)!;

  let viewbox: string | null = null;
  try {
    const url = new URL(NOMINATIM);
    url.searchParams.set('q', `${city.trim()}, India`);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const resp = await fetch(url.toString(), {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en' },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    const raw = (await resp.json()) as Array<{ boundingbox?: [string, string, string, string] }>;
    const bbox = raw[0]?.boundingbox;
    if (bbox && bbox.length === 4) {
      // Nominatim boundingbox = [south, north, west, east].
      // viewbox order = west,north,east,south.
      viewbox = `${bbox[2]},${bbox[1]},${bbox[3]},${bbox[0]}`;
    }
  } catch {
    viewbox = null;
  }

  cityViewboxCache.set(key, viewbox);
  return viewbox;
}

/** "west,north,east,south" → a Google Places rectangle (or null). */
function viewboxToRectangle(viewbox: string | null) {
  if (!viewbox) return null;
  const [west, north, east, south] = viewbox.split(',').map(Number);
  if ([west, north, east, south].some((n) => Number.isNaN(n))) return null;
  return {
    low: { latitude: south, longitude: west },
    high: { latitude: north, longitude: east },
  };
}

function extractCity(address: Record<string, string>): string {
  // `city` is most accurate but can contain e.g. "Chennai Corporation"
  if (address.city) return cleanCityName(address.city);
  // `state_district` often holds the real city for Mumbai-type places
  // e.g. "Mumbai City District" → "Mumbai"
  if (address.state_district) return cleanCityName(address.state_district);
  if (address.town) return cleanCityName(address.town);
  if (address.village) return cleanCityName(address.village);
  return '';
}

/** City name from Google Place Details addressComponents. */
function cityFromComponents(
  components: Array<{ types?: string[]; longText?: string }> = []
): string {
  const byType = (t: string) => components.find((c) => c.types?.includes(t))?.longText ?? '';
  return cleanCityName(
    byType('locality') ||
      byType('administrative_area_level_3') ||
      byType('administrative_area_level_2') ||
      ''
  );
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const resp = await fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
  return resp.json();
}

/** Like fetchJson but throws on a non-2xx response (so callers can fall back). */
async function fetchJsonOk(url: string, init?: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const resp = await fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
  if (!resp.ok) {
    throw new Error(`Upstream ${resp.status}`);
  }
  return resp.json();
}

/** Nominatim free-text business search (fallback when no Google key). */
async function nominatimAutocomplete(input: string, city?: string): Promise<Prediction[]> {
  const url = new URL(NOMINATIM);
  url.searchParams.set('q', input.trim());
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '8');
  url.searchParams.set('dedupe', '1');

  if (city && city.trim()) {
    const viewbox = await getCityViewbox(city);
    if (viewbox) {
      url.searchParams.set('viewbox', viewbox);
      url.searchParams.set('bounded', '1');
    }
  }

  const raw = (await fetchJson(url.toString(), {
    headers: { 'User-Agent': UA, 'Accept-Language': 'en' },
  })) as Array<{
    osm_id: number;
    display_name: string;
    name?: string;
    class?: string;
    type?: string;
    address: Record<string, string>;
    lat: string;
    lon: string;
  }>;

  return raw
    .filter((r) => !isNominatimRegion(r.class, r.type))
    .map((r) => {
    const namePart =
      r.address.amenity ?? r.address.shop ?? r.address.tourism ?? r.name ?? r.display_name.split(',')[0] ?? '';
    const cityName = extractCity(r.address);
    const shortAddr = [r.address.road, r.address.suburb, cityName].filter(Boolean).join(', ');
    return {
      place_id: String(r.osm_id),
      structured_formatting: { main_text: namePart, secondary_text: shortAddr },
      detail: {
        name: namePart,
        address: r.display_name,
        city: cityName,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.display_name)}`,
      },
    };
  });
}

/** Google Places (New) autocomplete — ranked prefix typeahead, city-restricted. */
async function googleAutocomplete(
  input: string,
  city: string | undefined,
  session: string | undefined,
  key: string
): Promise<Prediction[]> {
  const rectangle = city && city.trim() ? viewboxToRectangle(await getCityViewbox(city)) : null;

  const body: Record<string, unknown> = {
    input: input.trim(),
    includedRegionCodes: ['in'],
  };
  if (session) body.sessionToken = session;
  if (rectangle) body.locationRestriction = { rectangle };

  const data = (await fetchJsonOk(GOOGLE_AUTOCOMPLETE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
    body: JSON.stringify(body),
  })) as {
    suggestions?: Array<{
      placePrediction?: {
        placeId: string;
        types?: string[];
        structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } };
      };
    }>;
  };

  return (data.suggestions ?? [])
    .filter((s) => s.placePrediction && !isGoogleRegion(s.placePrediction.types))
    .map((s) => {
      const p = s.placePrediction!;
      return {
        place_id: p.placeId,
        structured_formatting: {
          main_text: p.structuredFormat?.mainText?.text ?? '',
          secondary_text: p.structuredFormat?.secondaryText?.text ?? '',
        },
      };
    });
}

/** Google Place Details (New) → the detail shape the client consumes. */
async function googlePlaceDetails(
  placeId: string,
  session: string | undefined,
  key: string
): Promise<PlaceDetail> {
  const url =
    GOOGLE_DETAILS_BASE + encodeURIComponent(placeId) + (session ? `?sessionToken=${session}` : '');
  const d = (await fetchJsonOk(url, {
    headers: {
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask':
        'displayName,formattedAddress,location,googleMapsUri,addressComponents,photos',
    },
  })) as {
    displayName?: { text: string };
    formattedAddress?: string;
    location?: { latitude: number; longitude: number };
    googleMapsUri?: string;
    addressComponents?: Array<{ types?: string[]; longText?: string }>;
    photos?: Array<{ name: string }>;
  };

  return {
    name: d.displayName?.text ?? '',
    address: d.formattedAddress ?? '',
    city: cityFromComponents(d.addressComponents),
    lat: d.location?.latitude ?? 0,
    lng: d.location?.longitude ?? 0,
    mapsUrl: d.googleMapsUri ?? '',
    photoName: d.photos?.[0]?.name,
  };
}

router.get('/autocomplete', placesLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { input, city, session } = req.query;
    if (!input || typeof input !== 'string' || !input.trim()) {
      return res.status(400).json({ error: 'input required' });
    }
    const cityStr = typeof city === 'string' ? city : undefined;
    const sessionStr = typeof session === 'string' ? session : undefined;

    const key = googleKey();
    if (key) {
      try {
        const predictions = await googleAutocomplete(input, cityStr, sessionStr, key);
        return res.json({ predictions, status: 'OK' });
      } catch {
        // Google failed (e.g. API not enabled / quota). Fall back to Nominatim
        // so the field still returns something instead of going silently empty.
      }
    }

    const predictions = await nominatimAutocomplete(input, cityStr);
    res.json({ predictions, status: 'OK' });
  } catch (err) {
    next(err);
  }
});

router.get('/details', placesLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { place_id, session } = req.query;
    if (!place_id || typeof place_id !== 'string') {
      return res.status(400).json({ error: 'place_id required' });
    }
    const key = googleKey();
    if (!key) {
      // No Google key → autocomplete used the Nominatim fallback, which returns
      // `detail` inline, so the client never calls this endpoint in that mode.
      return res.status(400).json({ error: 'details unavailable' });
    }

    const sessionStr = typeof session === 'string' ? session : undefined;
    try {
      const detail = await googlePlaceDetails(place_id, sessionStr, key);
      res.json(detail);
    } catch {
      res.status(502).json({ error: 'Could not load place details' });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
