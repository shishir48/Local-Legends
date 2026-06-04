# City-Scoped Place Search on Add-Gem — Design

**Date:** 2026-06-05
**Status:** Approved

## Goal

On the Add-Gem (Submit) screen, let the user pick a city first, then restrict the
business autocomplete to that city so the live dropdown only shows in-city results.

## Decisions

- **City source:** dedicated picker on the Submit screen (no prefill from the feed
  city). Business search is disabled until a city is chosen.
- **Scoping:** strict. Server uses Nominatim `viewbox` + `bounded=1` from the city's
  bounding box. No soft fallback to nearby cities (matches "from that city only").
- **Stored `gem.city`:** the **picked** city (canonical name from `INDIAN_CITIES`), not
  the place's extracted city — guarantees the gem appears under that city's feed filter.
- **Geocode failure:** if the city can't be resolved to a bbox, fall back to the current
  global (unbounded) search rather than breaking the field.

## User Flow

1. Open Submit. A **City** selector sits above the business search.
2. Business search field is disabled with hint "Pick a city first" until a city is set.
3. User picks a city (reuses `CityPickerModal` + `INDIAN_CITIES`).
4. User types a business name → each keypress (debounced, existing 400 ms) queries
   Nominatim restricted to the city's bbox → dropdown shows only in-city matches.
5. User selects a place. `name`, `address`, `lat`, `lng`, `mapsUrl` come from the place;
   `city` is the picked city.

## Server Changes — `apps/server/src/routes/places.ts`

### `/autocomplete` gains an optional `city` query param
- No `city` → current global behavior, unchanged.
- With `city` → restrict results to that city's bounding box.

### New helper: `getCityViewbox(city: string): Promise<string | null>`
- Geocodes the city via Nominatim search: `q=<city>, India`, `format=json`, `limit=1`,
  `featuretype=city` not required — read `boundingbox` from the first result.
- Nominatim `boundingbox` is `[south, north, west, east]` (lat,lat,lon,lon as strings).
- Returns a Nominatim `viewbox` string in the order `minLon,maxLat,maxLon,minLat`
  (i.e. `west,north,east,south`), or `null` if no result / fetch error.
- Result cached in a module-level `Map<string, string | null>` keyed by lowercased city.
  The city list is small and static, so each city is geocoded at most once per process.

### Autocomplete request
- If a non-empty `city` is provided, call `getCityViewbox(city)`.
- If it returns a viewbox: set `url.searchParams.set('viewbox', viewbox)` and
  `url.searchParams.set('bounded', '1')`.
- If it returns `null`: proceed without viewbox (global fallback).

### Rate limiting
- The city geocode shares the same outbound Nominatim budget. Because results are cached
  per city, the steady-state extra load is one geocode per distinct city. The existing
  `placesLimiter` (30/min/IP) still guards the `/autocomplete` route.

## Mobile Changes

### `apps/mobile/services/api.ts`
- `placesApi.autocomplete(input: string, city?: string)` — when `city` is provided, add it
  as a `city` query param alongside `input`.

### `apps/mobile/components/PlacesSearchField.tsx`
- Accept a `city: string | null` prop and a `disabled` boolean (derived: `!city`).
- When disabled, render the input non-interactive with placeholder "Pick a city first"
  and do not fire autocomplete.
- Pass `city` through to `placesApi.autocomplete(input, city)`.

### `apps/mobile/app/(app)/submit.tsx`
- Add `city` state (string | null) and a `showCityPicker` boolean.
- Render a **City** selector above `PlacesSearchField`: a button/chip showing the chosen
  city (or "Select city"), tapping it opens `CityPickerModal`.
- Pass `city` to `PlacesSearchField`.
- On `useFocusEffect` reset, also clear `city`.
- On place select, set form `city` to the **picked city** (state), not `p.city`.
- Keep `address`, `lat`, `lng`, `mapsUrl`, `name` from the selected place.
- Changing the city after a place is already selected clears the selected place (the place
  may not belong to the new city).

## Tests — `apps/server/test`

Add to a places e2e/unit test file (mock `fetch` so no real Nominatim calls):
- `/autocomplete?input=x&city=Lucknow` issues a geocode for the city, then an autocomplete
  request that includes `viewbox` and `bounded=1`.
- Second request for the same city does **not** re-issue the geocode (cache hit).
- When the city geocode returns no results, the autocomplete request is made **without**
  `viewbox`/`bounded` (global fallback) and still returns `status: 'OK'`.
- `/autocomplete?input=x` with no `city` behaves exactly as today (no viewbox).

Mobile has no automated test harness — manual verification: pick a city, confirm the
dropdown only shows in-city businesses; confirm search is disabled before a city is picked.

## Versioning

Bump server `package.json` patch and mobile `app.config.js` version per project rule.
Server change auto-deploys to the droplet; mobile ships via EAS Update (OTA).

## Out of Scope

- Prefilling the city from the feed selection.
- Soft/relaxed scoping or "search nearby cities" fallback.
- Switching the geocoder away from Nominatim.
- Per-city bbox persistence beyond the in-process cache.
