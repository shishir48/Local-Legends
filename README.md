# 📍 Local Legend

Community-voted hidden gems finder. Submit underrated cafés, parks, shops, bars, and art spaces — the community votes them to the top.

Portfolio project exercising the full-stack mobile loop: auth, CRUD, atomic voting, image uploads, maps, and a deployed REST API.

## Stack

**Mobile** — React Native (Expo SDK 54) + TypeScript, Expo Router, TanStack Query, Zustand, react-hook-form + Zod, react-native-maps, expo-image-picker, expo-location, expo-secure-store. Ships OTA via EAS Update.

**Backend** — Node.js + Express + TypeScript, MongoDB Atlas (Mongoose), JWT auth (bcrypt), Zod validation, Cloudinary uploads, express-rate-limit, Google Places autocomplete.

**Infra** — MongoDB Atlas M0, Cloudinary, DigitalOcean droplet (pm2). GitHub Actions: CI lint/typecheck + auto-deploy API to the droplet on push to `main`.

## Structure

```
local-legend/
├── apps/
│   ├── mobile/   # Expo app (6 screens, file-based routing)
│   └── server/   # Express API
└── README.md
```

## Quick start

**Backend**

```bash
cd apps/server
cp .env.example .env   # set MONGO_URI, JWT_SECRET, Cloudinary + Google Maps keys
npm install
npm run seed           # 3 users + 12 gems
npm run dev            # http://localhost:4000
```

**Mobile**

```bash
cd apps/mobile
npm install
npx expo start   # scan QR with Expo Go
```

API URL defaults to `https://shishir.cloud`. Override with the `API_URL` env var (e.g. your LAN IP `http://192.168.0.4:4000`) when running against a local server.

## Design choices

**Atomic voting, no transactions.** Each gem holds a `votedBy` array of user ids plus a `voteCount`. A vote is one `findByIdAndUpdate` with `$addToSet`/`$pull` + `$inc`. `$addToSet` enforces uniqueness at the operator level — concurrent toggles can't duplicate votes, no transaction needed at this scale.

**GeoJSON + 2dsphere.** `location` stored as `{ type: "Point", coordinates: [lng, lat] }` with a `2dsphere` index. `GET /api/gems/nearby` uses `$near` + `$maxDistance` (metres).

**Optimistic vote UI.** The `useVote` hook wraps `useMutation` with `onMutate` (snapshot + cache write), `onError` (rollback), `onSettled` (refetch). Button flips instantly, rolls back cleanly on failure.

**Defence-in-depth uploads.** Multer enforces MIME prefix + 5MB cap before bytes leave memory. Cloudinary validates formats (JPG/PNG/WEBP) and limits to 1600px longest edge (`crop: 'limit'`, no upscaling).

**Secure token storage.** JWT lives in `expo-secure-store` (Keychain / EncryptedSharedPreferences). On a 401 the auth store self-clears and routing redirects to login.

## API

| Method | Endpoint                | Description                           |
| ------ | ----------------------- | ------------------------------------- |
| POST   | `/api/auth/register`    | Create account, returns JWT           |
| POST   | `/api/auth/login`       | Sign in, returns JWT                  |
| GET    | `/api/auth/me`          | Logged-in user profile                |
| GET    | `/api/gems`             | Paginated list, filter + sort         |
| GET    | `/api/gems/nearby`      | Gems near `lat`/`lng` within `radius` |
| GET    | `/api/gems/:id`         | Single gem with `hasVoted` for viewer |
| POST   | `/api/gems`             | Submit a gem (multipart/form-data)    |
| PATCH  | `/api/gems/:id`         | Edit a gem (owner only)               |
| DELETE | `/api/gems/:id`         | Soft-delete (owner only)              |
| POST   | `/api/gems/:id/vote`    | Toggle upvote (idempotent, atomic)    |
| GET    | `/api/users/:id/gems`   | Submissions + total upvotes received  |
| PATCH  | `/api/users/me`         | Update display name / avatar          |
| GET    | `/api/categories`       | Static category list with emoji       |
| GET    | `/api/places/autocomplete` | Google Places autocomplete         |
| POST   | `/api/logs`             | Client log ingest (rate-limited)      |
| GET    | `/api/logs`             | Read logs (admin only)                |
| GET    | `/health`               | Health check                          |

## License

MIT
