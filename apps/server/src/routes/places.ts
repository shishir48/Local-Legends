import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

const router = Router();

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const UA = 'LocalLegend/1.0 (demo app)';
const FETCH_TIMEOUT_MS = 5_000;

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

function cleanCityName(s: string): string {
  return s.replace(CITY_SUFFIXES, '').trim();
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

router.get('/autocomplete', placesLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { input } = req.query;
    if (!input || typeof input !== 'string' || !input.trim()) {
      return res.status(400).json({ error: 'input required' });
    }

    const url = new URL(NOMINATIM);
    url.searchParams.set('q', input.trim());
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '8');
    url.searchParams.set('dedupe', '1');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const resp = await fetch(url.toString(), {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en' },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    const raw = await resp.json() as Array<{
      osm_id: number;
      display_name: string;
      name?: string;
      address: Record<string, string>;
      lat: string;
      lon: string;
    }>;

    const predictions = raw.map((r) => {
      const namePart = r.address.amenity ?? r.address.shop ?? r.address.tourism ?? r.name ?? r.display_name.split(',')[0] ?? '';
      const city = extractCity(r.address);
      const shortAddr = [r.address.road, r.address.suburb, city].filter(Boolean).join(', ');

      return {
        place_id: String(r.osm_id),
        structured_formatting: {
          main_text: namePart,
          secondary_text: shortAddr,
        },
        detail: {
          name: namePart,
          address: r.display_name,
          city,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.display_name)}`,
        },
      };
    });

    res.json({ predictions, status: 'OK' });
  } catch (err) {
    next(err);
  }
});

export default router;
