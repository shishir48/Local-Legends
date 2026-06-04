# Google Places Business Autocomplete (City-Scoped) — Design

**Date:** 2026-06-05
**Status:** Approved

## Problem

The Submit screen's business search uses Nominatim (an address geocoder). It cannot do
business prefix typeahead ("tun" → "Tunday Kababi") and returns very few business hits
("tunday" in Lucknow shows one result though many exist). Switch the autocomplete to
**Google Places API (New)** for true ranked typeahead, scoped to the selected city.

## Decisions

- **Provider:** Google **Places API (New)** v1. Its `locationRestriction.rectangle` maps
  exactly onto the city bounding box we already compute, giving strict in-city results.
- **Two-call flow:** Autocomplete returns predictions (place_id + text, no coordinates).
  On pick, a separate **Place Details** call fills address/lat/lng. Requires a new
  `/details` endpoint.
- **City bbox source:** reuse the existing Nominatim city→bbox cache in `places.ts` (free,
  already built). No Google geocoding call for the city.
- **Session tokens:** mobile generates one token per search session and passes it to both
  autocomplete and details, then resets it after a pick — Google bills the sequence as one
  session (cheaper).
- **Fallback:** if `GOOGLE_MAPS_API_KEY` is unset, both endpoints fall back to the current
  Nominatim behavior so dev/no-key environments keep working.

## API Contract (unchanged response shapes)

The mobile-facing JSON shapes stay the same so the client's existing types hold:

- Autocomplete prediction:
  `{ place_id: string, structured_formatting: { main_text: string, secondary_text: string }, detail?: {...} }`
  In Google mode `detail` is absent (fetched via `/details` on pick); in the Nominatim
  fallback `detail` is present inline (as today). The client's `PlacePrediction.detail`
  becomes optional.
- Details:
  `{ name: string, address: string, city: string, lat: number, lng: number, mapsUrl: string }`

## Server Changes — `apps/server/src/routes/places.ts`

### Config
`GOOGLE_MAPS_API_KEY` already exists in `config.ts` (optional). No schema change.

### City bbox → rectangle
Reuse `getCityViewbox(city)` (already returns `"west,north,east,south"`). Add a small
parser `viewboxToRectangle(viewbox)` returning
`{ low: { latitude: south, longitude: west }, high: { latitude: north, longitude: east } }`
for the Places request, or `null` if the viewbox is null.

### `GET /autocomplete?input=&city=&session=`
- Validate `input` as today (400 if missing/empty).
- If `GOOGLE_MAPS_API_KEY` is set:
  - `POST https://places.googleapis.com/v1/places:autocomplete`
  - Headers: `Content-Type: application/json`, `X-Goog-Api-Key: <key>`.
  - Body:
    ```json
    {
      "input": "<input>",
      "includedRegionCodes": ["in"],
      "sessionToken": "<session, if provided>",
      "locationRestriction": { "rectangle": { "low": {...}, "high": {...} } }
    }
    ```
    Include `locationRestriction` only when the city resolves to a rectangle; omit it
    otherwise (still region-restricted to India).
  - Map `response.suggestions[].placePrediction` →
    `{ place_id: placeId, structured_formatting: { main_text: structuredFormat.mainText.text, secondary_text: structuredFormat.secondaryText?.text ?? '' } }`.
  - Respond `{ predictions, status: 'OK' }`. Empty/absent suggestions → `predictions: []`.
- If `GOOGLE_MAPS_API_KEY` is **unset**: run the existing Nominatim autocomplete path
  unchanged (predictions include `detail` in that fallback, which is harmless).
- On Google fetch error: log and respond `{ predictions: [], status: 'OK' }` (don't 500 the
  field).

### `GET /details?place_id=&session=` (new)
- Validate `place_id` (400 if missing).
- If `GOOGLE_MAPS_API_KEY` is set:
  - `GET https://places.googleapis.com/v1/places/<place_id>?sessionToken=<session>`
  - Headers: `X-Goog-Api-Key: <key>`,
    `X-Goog-FieldMask: displayName,formattedAddress,location,googleMapsUri,addressComponents`.
  - Map →
    `{ name: displayName.text, address: formattedAddress, city: <from addressComponents 'locality' (fallback 'administrative_area_level_2')>, lat: location.latitude, lng: location.longitude, mapsUrl: googleMapsUri }`.
  - Respond the detail object directly.
- If unset: respond `400 { error: 'details unavailable' }` (the Nominatim fallback supplies
  detail inline in predictions, so the client doesn't call `/details` in that mode — see
  mobile note).
- On fetch error: `502 { error: 'Could not load place details' }`.

### Rate limiting
Both routes keep the existing `placesLimiter` (30/min/IP). The city bbox cache means at most
one Nominatim geocode per distinct city.

## Mobile Changes

### `apps/mobile/services/api.ts`
- `placesApi.autocomplete(input: string, city?: string, session?: string)` — add `session`
  param (query `session`), keep `city`.
- Add `placesApi.details(placeId: string, session?: string)` →
  `GET /api/places/details?place_id=&session=` returning the detail shape (`PlaceResult`).

### `apps/mobile/components/PlacesSearchField.tsx`
- Generate a **session token** (e.g. `expo-crypto randomUUID` or a simple uuid) lazily on the
  first keystroke of a search; store in a ref. Pass it to `autocomplete`.
- Keep the debounced typeahead. Predictions now lack `detail`.
- On pick: if the prediction already carries an inline `detail` (Nominatim fallback mode,
  when no Google key is set), call `onSelect(detail)` directly. Otherwise (Google mode) set
  a brief loading state, call `placesApi.details(place_id, session)`, then `onSelect(detail)`.
  Clear/rotate the session token after a successful pick.
- On details error: show "Couldn't load that place, try another." and keep the field open.
- Disabled-until-city behavior stays.

### `apps/mobile/app/(app)/submit.tsx`
- No functional change (city picker, canonical-city storage, gating all stay). Behavior
  rides on `PlacesSearchField`.

## Deploy Prerequisite (you)

Provide a Google Cloud API key with **Places API (New)** enabled and billing on. It will be
set as `GOOGLE_MAPS_API_KEY` in the droplet `.env` and the API restarted. Until then,
autocomplete uses the Nominatim fallback (current behavior).

## Tests — `apps/server/test/places.e2e.test.ts`

Mock `fetch`; set `process.env.GOOGLE_MAPS_API_KEY` for the Google-path tests:
- autocomplete with key + city posts to the Places New endpoint with a `rectangle`
  `locationRestriction` and maps `suggestions` → `predictions`.
- autocomplete with key, no city → request omits `locationRestriction` but keeps
  `includedRegionCodes:['in']`.
- autocomplete with **no key** → existing Nominatim path (existing tests still pass).
- `/details` with key maps `displayName/location/formattedAddress/googleMapsUri` → detail
  shape, with `city` extracted from `addressComponents`.
- `/details` with no key → 400.

Mobile has no automated test harness — manual verification: in Lucknow, "tun" surfaces
Tunday Kababi and other "tun…" businesses; many results show; picking one fills
address/coords.

## Versioning

Bump server `package.json` patch and mobile `app.config.js` version. Server auto-deploys;
mobile ships via EAS Update (OTA).

## Out of Scope

- Switching the city bbox source away from Nominatim.
- Caching Google autocomplete/details responses.
- Maps/photos beyond the existing `mapsUrl` link.
- Reworking the Submit screen layout.
