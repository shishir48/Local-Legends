# FCM Push Notifications — Design Spec

**Date:** 2026-06-06
**Status:** Approved (design), pending implementation plan
**Scope:** v1 — vote-milestone alerts, Android only, FCM HTTP v1 via `firebase-admin`

## Goal

Hook users by rewarding contributors: when a gem a user submitted reaches an
upvote milestone, push them a notification ("Your gem just hit 25 upvotes!").
First step toward a broader retention system (gem-of-the-day, follows, etc.),
deliberately kept minimal to prove the push pipeline end-to-end.

## Decisions (locked during brainstorm)

| Decision | Choice |
|---|---|
| Backend | FCM HTTP v1 via `firebase-admin` SDK, in-process in the existing Express API |
| Platforms | Android only (no Apple Developer account needed yet) |
| v1 triggers | Vote-milestone alerts only |
| Vote cadence | Milestones: `[1, 10, 25, 50, 100, 250, 500, 1000]`, one push per threshold crossed |
| Permission prompt | After the user's first gem submit (highest-intent moment) |
| Logout | Delete this device's token (DELETE /push/register) |

## Non-goals (v1)

- iOS / APNs.
- Gem-of-the-day, follows, comments, or any non-vote trigger.
- Daily digests / batching (no scheduler in v1).
- Mobile unit tests (repo has none; manual device verification).

## Architecture & data flow

All push logic runs in-process in the existing Node/Express API on the DO VM.
No new service.

```
Mobile (expo-notifications)                Server (Express API on DO VM)
─────────────────────────────             ──────────────────────────────
permission granted (after 1st submit)
  → getDevicePushTokenAsync()  ──POST /api/push/register──►  PushToken collection
                                                              (upsert by token)
logout ─────────────────────  ──DELETE /api/push/register──► remove token

upvote ──POST /gems/:id/vote──► toggleVote()
                                  └─ if crossed a milestone & not self-vote:
                                       set notifiedVoteMilestone
                                       sendToUser(submitter) (not awaited)
                                       firebase-admin sendEachForMulticast
                                       prune stale tokens ──► FCM ──► device
```

- `firebase-admin` is initialized once at boot from a **service-account JSON**
  stored on the VM as a secret (mirrors Mongo/ADMIN_EMAIL handling — never
  committed).
- Sending is **fire-and-forget** relative to the vote response: the voter's
  `POST /vote` must never block or fail on a push error. Notify runs after the
  vote is committed; errors are swallowed and logged.

## Data model

### New `PushToken` collection

Separate collection (not embedded in User) → multi-device support + easy pruning.

```
PushToken {
  token:     String, required, unique, index   // native FCM token
  user:      ObjectId → User, required, index   // owner
  platform:  'android'                          // 'ios' reserved for later
  createdAt / updatedAt                         // timestamps
}
```

- **Register** = upsert by `token`: `findOneAndUpdate({ token }, { user, platform }, { upsert: true })`. Re-registering the same device just rebinds `user`; no duplicates.
- One user → many tokens (multiple devices). One token → exactly one user (latest login wins).
- Prune a token when FCM reports it unregistered/invalid, or on logout.

### New field on `Gem`

```
notifiedVoteMilestone: Number, default 0   // highest milestone already pushed
```

Prevents re-firing when votes toggle across a threshold. A push fires only when
the new `voteCount` crosses a milestone strictly greater than
`notifiedVoteMilestone`; then `notifiedVoteMilestone` is bumped to it.

## Server components

### `lib/push.ts` — firebase-admin wrapper

- `initPush()` — called at boot. Reads service-account JSON path from
  `FCM_SERVICE_ACCOUNT_PATH`. If unset/missing/malformed: log a clear warning,
  leave push **disabled** (no-op), server still starts. This keeps dev + CI
  running with zero Firebase setup.
- `sendToUser(userId, { title, body, data })` — loads the user's tokens,
  `sendEachForMulticast`, then deletes any token FCM marks
  `messaging/registration-token-not-registered` or `invalid-argument`. Swallows
  and logs errors. Returns counts. No-op when push disabled or user has no tokens.

### `services/pushTokenService.ts`

- `registerToken(userId, token, platform)` → upsert.
- `removeToken(token)` → delete.

### `routes/push.ts` + controller (both `requireAuth`)

- `POST /api/push/register` `{ token, platform }` → 204.
- `DELETE /api/push/register` `{ token }` → 204.

Validate `token` (non-empty string) and `platform` (`'android'`) with zod,
consistent with existing validators.

### Milestone hook in `gemService.toggleVote`

- Extend the upvote branch's query to also select `submittedBy` and
  `notifiedVoteMilestone`.
- After a successful upvote (`voted: true`): compute the highest milestone
  `<= voteCount` that is `> notifiedVoteMilestone`. If one exists **and**
  `submittedBy !== voterId` (no self-pings):
  - atomically `$set notifiedVoteMilestone` to that value (guards against
    concurrent double-send), and
  - call `sendToUser(submittedBy, …)` — **not awaited** in the vote path,
    `.catch(log)`.
- Push `data`: `{ type: 'gem_milestone', gemId }` for deep-linking.

### Boot wiring

`initPush()` in `index.ts` alongside `ensureAdminUser()`.

### Notification copy

- Title: `Your gem is on fire 🔥`
- Body: `{gemName} just hit {milestone} upvotes!`

## Mobile

### New dependencies (native — forces a fresh build)

`expo-notifications`, `expo-device`, `expo-build-properties`. Plus
`google-services.json` referenced via `app.config.js`
(`android.googleServicesFile`) and the `expo-notifications` config plugin.

### `lib/push.ts` (mobile)

- `registerForPush()`:
  - `Device.isDevice` guard (skip emulators).
  - `getPermissionsAsync` → if not granted, `requestPermissionsAsync`.
  - On granted: `getDevicePushTokenAsync()` (native FCM token) →
    `pushApi.register(token, 'android')`.
- `unregisterPush(token)` → `pushApi.remove(token)`.

### `services/api.ts`

- `pushApi.register(token, platform)` → `POST /api/push/register`.
- `pushApi.remove(token)` → `DELETE /api/push/register`.

### Wiring

- **First-submit prompt:** after a successful first gem submit, call
  `registerForPush()` (triggers the OS permission dialog in context). Persist an
  "asked already" flag in SecureStore to avoid re-nagging.
- **Re-sync on launch:** in root `_layout.tsx`, after auth hydrate, if
  permission is **already granted**, silently `registerForPush()` (FCM tokens
  rotate; keep server fresh).
- **Logout:** in `authStore.logout`, capture the current token and
  `unregisterPush(token)` before clearing auth.

### Tap-to-open (deep link)

`expo-notifications` response listener reads `data.gemId` →
`router.push('/gems/{gemId}')`. Handles both cold-start and background taps.

### Foreground

Set a notification handler so a push received while the app is open still shows
a banner.

## Error handling

All push is non-blocking and degrades safely:

- Push disabled when `FCM_SERVICE_ACCOUNT_PATH` unset → `sendToUser` is a logged
  no-op. Dev + CI need no Firebase.
- Vote path never fails on push: notify fires after the vote commits, wrapped in
  `.catch(log)`. A push outage cannot break voting.
- Stale tokens auto-deleted on send.
- `registerForPush` is best-effort: permission denied or no token → silent
  return, no crash, no retry loop.
- Malformed/missing service-account JSON at boot → warn, disable push, start
  normally.

## Testing

### Server (vitest)

- `pushTokenService`: register upserts (no dupes on re-register); remove deletes.
- `POST`/`DELETE /api/push/register`: 204; require auth (401).
- **Milestone logic** (mock `sendToUser`): crossing 1/10/25 fires once;
  mid-milestone votes don't fire; re-crossing after a toggle doesn't re-fire
  (`notifiedVoteMilestone` respected); **self-vote never notifies**.
- `lib/push` with no service account → no-op, no throw.
- Existing 76 tests stay green.

### Mobile

No unit tests (matches repo). Manual verification on a real device.

### Manual end-to-end (one-time, real device)

Submit gem → grant permission → second account upvotes past a milestone →
push arrives → tap → opens the gem.

## Build sequencing & deployment

Adding `expo-notifications` + `google-services.json` is a **native** change. It
does **not** ship over EAS Update — it needs a fresh build and reinstall.

### One-time setup (consoles)

1. Firebase project → add Android app with the package id from `app.config.js`
   → download `google-services.json`.
2. Firebase → service account → generate private key JSON → place on the DO VM
   at `/opt/local-legend-api/fcm-service-account.json`; add
   `FCM_SERVICE_ACCOUNT_PATH` to prod `.env`. Never committed (gitignored;
   documented in `.env.example`).

### Ship order (matters)

1. **Server first** — deploy API with push endpoints + `initPush` + milestone
   hook. Safe: push stays disabled until the service-account env is set, so
   nothing breaks. Then drop the JSON on the VM, set env, restart → push live
   server-side.
2. **Mobile build** — `eas build --profile production` (new app-bundle, native
   dep). Token registration works only on this build forward; the current
   installed build can't register (no native module). OTA cannot deliver this —
   users must install the new build.
3. Later JS-only tweaks to push logic can OTA; the initial native module cannot.

### Constraints

- Android-only (no Apple account needed).
- `runtimeVersion` is pinned `1.1.4`. Adding a native module is exactly when it
  should bump; a new build must go out under the new runtime before OTAs land
  under it. The implementation plan will call out the runtimeVersion bump and
  build explicitly.
- Emulators can't reliably get FCM tokens — verify on a real device.

## New env vars

| Var | Where | Purpose |
|---|---|---|
| `FCM_SERVICE_ACCOUNT_PATH` | server `.env` | Path to the Firebase service-account JSON on the VM. Unset → push disabled. |

## Open follow-ups (post-v1, not in scope)

- iOS/APNs support.
- Gem-of-the-day scheduler + per-city selection.
- Follows and "new gem from people you follow" pushes.
- Per-user notification preferences / mute.
