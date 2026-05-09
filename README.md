# 📍 Local Legend

A community-voted hidden gems finder. Submit underrated cafés, parks, shops, bars, and art spaces — the community votes them to the top.

Built as a portfolio project to exercise the full-stack mobile loop: auth, CRUD, an atomic voting system, image uploads, map integration, and a deployed REST API.

## Stack

**Mobile** — React Native (Expo SDK 51) + TypeScript, Expo Router, TanStack Query, Zustand, react-hook-form + Zod, react-native-maps, expo-image-picker, expo-location, expo-secure-store.

**Backend** — Node.js + Express + TypeScript, MongoDB Atlas via Mongoose, JWT auth with bcrypt, Zod validation, Cloudinary photo uploads via streaming, express-rate-limit.

**Infra** — MongoDB Atlas M0, Cloudinary, Railway-ready, GitHub Actions for lint/typecheck.

## Project structure

```
local-legend/
├── apps/
│   ├── mobile/   # Expo app (5 screens, file-based routing)
│   └── server/   # Express API (15 endpoints)
└── README.md
```

## Quick start

### Backend

```bash
cd apps/server
cp .env.example .env
# Fill in MONGO_URI, JWT_SECRET, and Cloudinary keys
npm install
npm run seed   # 3 users + 12 gems
npm run dev    # http://localhost:4000
```

### Mobile

```bash
cd apps/mobile
npm install
npx expo start   # scan QR with Expo Go
```

If running on a phone (not simulator), set `extra.apiUrl` in `app.json` to your machine's LAN IP, e.g. `http://192.168.0.4:4000`.

## Notable design choices

**Atomic voting without transactions.** Each gem stores a `votedBy` array of user ObjectIds plus a `voteCount` integer. Voting is a single `findByIdAndUpdate` with `$addToSet` (or `$pull`) plus `$inc`. `$addToSet` enforces uniqueness at the operator level — concurrent toggles cannot create duplicate votes, and no separate collection or transaction is needed at this scale.

**GeoJSON + 2dsphere index.** `location` is stored as `{ type: "Point", coordinates: [lng, lat] }` with a `2dsphere` index. The `GET /api/gems/nearby` endpoint uses MongoDB's native `$near` operator with `$maxDistance` in metres.

**Optimistic vote UI.** The mobile `useVote` hook wraps `useMutation` with `onMutate` (snapshot + immediate cache write), `onError` (rollback), and `onSettled` (invalidate + refetch). The vote button flips colour the instant the user taps, even on a slow network — and rolls back cleanly if the request fails.

**Defence-in-depth on uploads.** Multer enforces MIME prefix and a 5MB cap before bytes leave memory. Cloudinary then validates allowed formats (JPG/PNG/WEBP) and resizes anything bigger than 1600px on the longest edge with `crop: 'limit'` so we never upscale.

**Token storage on mobile.** JWT lives in `expo-secure-store` (Keychain on iOS, EncryptedSharedPreferences on Android). On a 401 from the API, the auth store self-clears so the routing layout redirects to login.

## API

| Method | Endpoint                  | Description                            |
| ------ | ------------------------- | -------------------------------------- |
| POST   | `/api/auth/register`      | Create account, returns JWT            |
| POST   | `/api/auth/login`         | Sign in, returns JWT                   |
| GET    | `/api/auth/me`            | Logged-in user profile                 |
| GET    | `/api/gems`               | Paginated list, filter + sort          |
| GET    | `/api/gems/nearby`        | Gems near `lat`/`lng` within `radius`  |
| GET    | `/api/gems/:id`           | Single gem with `hasVoted` for viewer  |
| POST   | `/api/gems`               | Submit a gem (multipart/form-data)     |
| PATCH  | `/api/gems/:id`           | Edit a gem (owner only)                |
| DELETE | `/api/gems/:id`           | Soft-delete (owner only)               |
| POST   | `/api/gems/:id/vote`      | Toggle upvote (idempotent, atomic)     |
| GET    | `/api/users/:id/gems`     | Submissions + total upvotes received   |
| PATCH  | `/api/users/me`           | Update display name / avatar           |
| GET    | `/api/categories`         | Static category list with emoji        |
| GET    | `/health`                 | Health check                           |

## License

MIT
