# Forgot Password — Design

**Date:** 2026-06-05
**Status:** Approved

## Goal

Let a user who forgot their password reset it from the mobile login screen, using a
6-digit code delivered by email. No existing email infrastructure — add transactional
email via the Resend HTTP API.

## User Flow

1. On the login screen the user taps **"Forgot password?"**.
2. User enters their email and submits.
3. Server emails a 6-digit reset code (15-minute expiry).
4. User enters the code + a new password in the app.
5. Server verifies and resets the password, returns a JWT, and the app logs the user in
   automatically.

## Decisions

- **Delivery:** Resend HTTP API (not SMTP). DigitalOcean blocks port 25 and self-hosted
  MTA deliverability is unreliable; Resend gives best deliverability with least ops.
  Sending domain: `shishir.cloud` (verified with SPF + DKIM in Resend).
- **Reset mechanism:** 6-digit numeric code entered in-app. Avoids Expo deep-link /
  universal-link configuration.
- **Auto-login after reset:** reset-password returns a JWT so the user lands logged in.

## Server Changes

### `lib/config.ts`
Add config values:
- `RESEND_API_KEY` — required for email send.
- `EMAIL_FROM` — e.g. `Local Legend <noreply@shishir.cloud>`.

### `lib/email.ts` (new)
Thin wrapper over the Resend HTTP API using `fetch` (no SDK dependency).
- `sendPasswordResetCode(to: string, code: string): Promise<void>`
- Sends a short plaintext + minimal HTML email containing the code and a note that it
  expires in 15 minutes.
- On Resend API error: log and throw (caller decides surfacing — see service).

### `models/User.ts`
Add fields:
- `resetCodeHash: String | null` (default `null`)
- `resetCodeExpires: Date | null` (default `null`)
- `resetAttempts: Number` (default `0`)

Extend the existing `toJSON` transform to also delete `resetCodeHash`,
`resetCodeExpires`, `resetAttempts` (currently only `passwordHash` is stripped).

### `services/authService.ts`
- `requestPasswordReset(email: string): Promise<void>`
  - Find user by lowercased email.
  - If no user: return silently (anti-enumeration — caller still returns generic 200).
  - If user exists: generate a 6-digit code, bcrypt-hash it, store
    `resetCodeHash`, `resetCodeExpires = now + 15 min`, `resetAttempts = 0`, then
    `sendPasswordResetCode`.
- `resetPassword(input: { email; code; newPassword }): Promise<{ user; token }>`
  - Find user by lowercased email.
  - Reject (generic `ApiError`) if: no user, no `resetCodeHash`, expired, or
    `resetAttempts >= 5`.
  - bcrypt-compare the code. On mismatch: increment `resetAttempts`, save, throw generic
    "Invalid or expired code".
  - On success: set new `passwordHash` (bcrypt, same `BCRYPT_ROUNDS`), clear
    `resetCodeHash` / `resetCodeExpires` / reset `resetAttempts = 0`, save.
  - Sign and return a JWT (reuse `signToken`) plus `user.toJSON()`.

### `controllers/authController.ts`
- `forgotPassword` — zod `{ email }`; call `requestPasswordReset`; always respond `200`
  with a generic `{ message: 'If that email exists, a reset code has been sent.' }`.
- `resetPassword` — zod `{ email, code (6-digit string), newPassword (min 8, max 72) }`;
  call `resetPassword`; respond `200` with `{ user, token }`.

### `routes/auth.ts`
```ts
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password',  authLimiter, authController.resetPassword);
```
Reuses the existing `authLimiter` (20 requests / 15 min / IP).

## Security

- **Enumeration-safe:** `forgot-password` always returns the same generic 200 regardless
  of whether the email exists.
- **Code at rest:** stored bcrypt-hashed, never in plaintext, never serialized to JSON.
- **Expiry:** 15 minutes.
- **Single use:** reset fields cleared on successful reset.
- **Brute-force cap:** max 5 verify attempts per issued code, then code is dead (user must
  request a new one).
- **Rate limiting:** existing `authLimiter` on both routes.

## Mobile Changes

### `services/api.ts`
Add to `authApi`:
- `forgotPassword: (input: { email: string }) => Promise<{ message: string }>`
- `resetPassword: (input: { email; code; newPassword }) => Promise<{ user: AuthUser; token: string }>`

### `app/(auth)/login.tsx`
Add a **"Forgot password?"** link below the login form that navigates to the new screen.

### `app/(auth)/forgot-password.tsx` (new)
Single screen, two phases:
- **Phase 1 — request:** email input → calls `forgotPassword` → advances to phase 2 with a
  generic confirmation.
- **Phase 2 — reset:** code input + new password input → calls `resetPassword` → on success
  stores `{ user, token }` via `authStore`, which redirects into the app.

Follows the existing styling/patterns of `login.tsx` / `register.tsx`.

## Tests (`apps/server/test`)

Add cases (e2e in `auth.e2e.test.ts` and/or service unit tests):
- request reset for existing user stores a hashed code + expiry and returns generic 200
- request reset for unknown email returns the same generic 200 (no enumeration)
- reset with correct code succeeds, returns a token, clears reset fields
- reset with wrong code fails and increments attempts
- reset blocked after 5 failed attempts
- reset with expired code fails

Email send is mocked in tests (no real Resend calls).

## Versioning

Bump app version per project rule (mobile `app.config.js`, server `package.json`) on
implementation.

## Out of Scope

- Deep-link / universal-link reset.
- Web reset page.
- Changing password while logged in (separate feature).
- Email verification on registration.
