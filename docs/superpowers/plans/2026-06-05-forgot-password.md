# Forgot Password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user reset a forgotten password via a 6-digit code emailed through Resend, completed in-app with auto-login.

**Architecture:** Add two unauthenticated server routes (`/api/auth/forgot-password`, `/api/auth/reset-password`). Reset codes are bcrypt-hashed and stored on the User document with a 15-minute expiry and a 5-attempt cap. Email delivery is a thin `fetch`-based wrapper over the Resend HTTP API. Mobile adds a single two-phase screen plus a link from the login screen.

**Tech Stack:** Express, Mongoose, bcryptjs, jsonwebtoken, zod, vitest + supertest (server); Expo Router, react-hook-form, zod, @tanstack/react-query, zustand (mobile).

---

## File Structure

**Server**
- `apps/server/src/lib/config.ts` — add `RESEND_API_KEY` (optional), `EMAIL_FROM` (default).
- `apps/server/src/lib/email.ts` — **new**, Resend wrapper `sendPasswordResetCode`.
- `apps/server/src/models/User.ts` — add reset fields + strip them in `toJSON`.
- `apps/server/src/services/authService.ts` — add `requestPasswordReset`, `resetPassword`.
- `apps/server/src/controllers/authController.ts` — add `forgotPassword`, `resetPassword` handlers + zod schemas.
- `apps/server/src/routes/auth.ts` — register two routes.
- `apps/server/test/auth.e2e.test.ts` — add e2e cases (mock `lib/email`).

**Mobile**
- `apps/mobile/services/api.ts` — add `authApi.forgotPassword`, `authApi.resetPassword`.
- `apps/mobile/hooks/useAuth.ts` — add `useForgotPassword`, `useResetPassword`.
- `apps/mobile/app/(auth)/forgot-password.tsx` — **new**, two-phase screen.
- `apps/mobile/app/(auth)/login.tsx` — add "Forgot password?" link.
- `apps/mobile/app.config.js` + `apps/server/package.json` — version bump.

Mobile has no automated test harness; mobile tasks use manual verification steps, matching the existing codebase (server is the only tested package).

---

## Task 1: Config values for email

**Files:**
- Modify: `apps/server/src/lib/config.ts:4-15`

- [ ] **Step 1: Add the two env fields**

In `EnvSchema`, add after `GOOGLE_MAPS_API_KEY`:

```ts
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Local Legend <noreply@shishir.cloud>'),
```

`RESEND_API_KEY` is optional so dev/test run without it (the email wrapper degrades to logging — see Task 3).

- [ ] **Step 2: Typecheck**

Run: `cd apps/server && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/lib/config.ts
git commit -m "feat(server): add RESEND_API_KEY and EMAIL_FROM config"
```

---

## Task 2: User model reset fields

**Files:**
- Modify: `apps/server/src/models/User.ts:3-31`
- Test: `apps/server/test/auth.e2e.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `apps/server/test/auth.e2e.test.ts` inside the `GET /api/auth/me` describe (or a new describe) — it asserts the reset fields never leak through the existing `me` route. Append this new describe block at the end of the file:

```ts
describe('User toJSON strips reset fields', () => {
  it('never exposes resetCodeHash / resetCodeExpires / resetAttempts', async () => {
    const u = await makeUser();
    const res = await request(app).get('/api/auth/me').set(auth(u.token)).expect(200);
    expect(res.body.resetCodeHash).toBeUndefined();
    expect(res.body.resetCodeExpires).toBeUndefined();
    expect(res.body.resetAttempts).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it passes trivially first (fields not yet added)**

Run: `cd apps/server && npx vitest run test/auth.e2e.test.ts -t "strips reset fields"`
Expected: PASS (fields don't exist yet, so they're undefined). This guards against regressions once fields are added.

- [ ] **Step 3: Add the schema fields**

In `UserSchema`, add after `isAdmin`:

```ts
    resetCodeHash: { type: String, default: null },
    resetCodeExpires: { type: Date, default: null },
    resetAttempts: { type: Number, default: 0 },
```

- [ ] **Step 4: Strip the fields in toJSON**

In the `toJSON` transform, after `delete ret.passwordHash;` add:

```ts
    delete ret.resetCodeHash;
    delete ret.resetCodeExpires;
    delete ret.resetAttempts;
```

- [ ] **Step 5: Run test to verify it still passes (now meaningful)**

Run: `cd apps/server && npx vitest run test/auth.e2e.test.ts -t "strips reset fields"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/models/User.ts apps/server/test/auth.e2e.test.ts
git commit -m "feat(server): add password-reset fields to User, strip from JSON"
```

---

## Task 3: Email wrapper (Resend)

**Files:**
- Create: `apps/server/src/lib/email.ts`

- [ ] **Step 1: Write the wrapper**

Create `apps/server/src/lib/email.ts`:

```ts
import { config } from './config';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/**
 * Send a password-reset code email via the Resend HTTP API.
 * If RESEND_API_KEY is not configured (dev/test), logs the code instead of
 * sending so local flows still work without email infrastructure.
 */
export async function sendPasswordResetCode(to: string, code: string): Promise<void> {
  if (!config.RESEND_API_KEY) {
    // eslint-disable-next-line no-console
    console.warn(`[email] RESEND_API_KEY not set — reset code for ${to}: ${code}`);
    return;
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.EMAIL_FROM,
      to,
      subject: 'Your Local Legend password reset code',
      text: `Your password reset code is ${code}. It expires in 15 minutes. If you didn't request this, ignore this email.`,
      html: `<p>Your password reset code is <strong style="font-size:20px;letter-spacing:2px">${code}</strong>.</p><p>It expires in 15 minutes. If you didn't request this, you can ignore this email.</p>`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend send failed: ${res.status} ${body}`);
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/server && npx tsc --noEmit`
Expected: no errors. (`fetch` is global in Node 18+; the repo targets Node ≥18.)

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/lib/email.ts
git commit -m "feat(server): add Resend email wrapper for reset codes"
```

---

## Task 4: authService reset logic

**Files:**
- Modify: `apps/server/src/services/authService.ts`
- Test: `apps/server/test/auth.e2e.test.ts` (driven via routes in Task 5; here we add the service code)

This task adds the service functions. They are exercised end-to-end by the route tests in Task 5, so no separate unit test is added here — Task 5 writes the failing tests first.

- [ ] **Step 1: Add imports + constants**

At the top of `apps/server/src/services/authService.ts`, after the existing imports, add:

```ts
import { sendPasswordResetCode } from '../lib/email';
```

Below `const BCRYPT_ROUNDS = 12;` add:

```ts
const RESET_CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const RESET_MAX_ATTEMPTS = 5;

function generateResetCode(): string {
  // 6-digit numeric, zero-padded.
  return String(Math.floor(100000 + Math.random() * 900000));
}
```

- [ ] **Step 2: Add `requestPasswordReset`**

Append to `apps/server/src/services/authService.ts`:

```ts
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await User.findOne({ email: email.toLowerCase() });
  // Anti-enumeration: silently return if the user does not exist.
  if (!user) return;

  const code = generateResetCode();
  user.resetCodeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);
  user.resetCodeExpires = new Date(Date.now() + RESET_CODE_TTL_MS);
  user.resetAttempts = 0;
  await user.save();

  await sendPasswordResetCode(user.email, code);
}
```

- [ ] **Step 3: Add `resetPassword`**

Append to `apps/server/src/services/authService.ts`:

```ts
export async function resetPassword(input: {
  email: string;
  code: string;
  newPassword: string;
}) {
  const user = await User.findOne({ email: input.email.toLowerCase() });

  const invalid = () => ApiError.badRequest('Invalid or expired code');

  if (
    !user ||
    !user.resetCodeHash ||
    !user.resetCodeExpires ||
    user.resetCodeExpires.getTime() < Date.now() ||
    user.resetAttempts >= RESET_MAX_ATTEMPTS
  ) {
    throw invalid();
  }

  const ok = await bcrypt.compare(input.code, user.resetCodeHash);
  if (!ok) {
    user.resetAttempts += 1;
    await user.save();
    throw invalid();
  }

  user.passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
  user.resetCodeHash = null;
  user.resetCodeExpires = null;
  user.resetAttempts = 0;
  await user.save();

  const token = signToken(user._id.toString(), user.email);
  return { user: user.toJSON(), token };
}
```

- [ ] **Step 4: Typecheck**

Run: `cd apps/server && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/services/authService.ts
git commit -m "feat(server): add requestPasswordReset and resetPassword services"
```

---

## Task 5: Controller, routes, and e2e tests

**Files:**
- Modify: `apps/server/src/controllers/authController.ts`
- Modify: `apps/server/src/routes/auth.ts`
- Test: `apps/server/test/auth.e2e.test.ts`

- [ ] **Step 1: Write the failing tests**

At the TOP of `apps/server/test/auth.e2e.test.ts`, add a mock of the email module that captures the most recent code. Place it directly under the existing imports:

```ts
import { vi } from 'vitest';

const sentCodes: { to: string; code: string }[] = [];
vi.mock('../src/lib/email', () => ({
  sendPasswordResetCode: vi.fn(async (to: string, code: string) => {
    sentCodes.push({ to, code });
  }),
}));
```

Then append this describe block at the end of the file:

```ts
describe('Password reset flow', () => {
  it('forgot-password returns generic 200 for an existing user and sends a code', async () => {
    sentCodes.length = 0;
    await makeUser({ email: 'reset1@test.dev', password: 'password123' });
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'reset1@test.dev' })
      .expect(200);
    expect(res.body.message).toMatch(/reset code/i);
    expect(sentCodes.at(-1)?.to).toBe('reset1@test.dev');
    expect(sentCodes.at(-1)?.code).toMatch(/^\d{6}$/);
  });

  it('forgot-password returns the same generic 200 for an unknown email (no enumeration)', async () => {
    sentCodes.length = 0;
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'ghost@test.dev' })
      .expect(200);
    expect(res.body.message).toMatch(/reset code/i);
    expect(sentCodes.length).toBe(0);
  });

  it('reset-password with the correct code sets a new password and returns a token', async () => {
    sentCodes.length = 0;
    await makeUser({ email: 'reset2@test.dev', password: 'password123' });
    await request(app).post('/api/auth/forgot-password').send({ email: 'reset2@test.dev' }).expect(200);
    const code = sentCodes.at(-1)!.code;

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'reset2@test.dev', code, newPassword: 'newpassword123' })
      .expect(200);
    expect(res.body.token).toBeTypeOf('string');

    // old password no longer works, new one does
    await request(app).post('/api/auth/login').send({ email: 'reset2@test.dev', password: 'password123' }).expect(401);
    await request(app).post('/api/auth/login').send({ email: 'reset2@test.dev', password: 'newpassword123' }).expect(200);
  });

  it('reset-password with a wrong code fails with 400', async () => {
    sentCodes.length = 0;
    await makeUser({ email: 'reset3@test.dev', password: 'password123' });
    await request(app).post('/api/auth/forgot-password').send({ email: 'reset3@test.dev' }).expect(200);

    await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'reset3@test.dev', code: '000000', newPassword: 'newpassword123' })
      .expect(400);
  });

  it('reset-password is blocked after 5 failed attempts', async () => {
    sentCodes.length = 0;
    await makeUser({ email: 'reset4@test.dev', password: 'password123' });
    await request(app).post('/api/auth/forgot-password').send({ email: 'reset4@test.dev' }).expect(200);
    const realCode = sentCodes.at(-1)!.code;
    const wrong = realCode === '000000' ? '111111' : '000000';

    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/reset-password')
        .send({ email: 'reset4@test.dev', code: wrong, newPassword: 'newpassword123' })
        .expect(400);
    }
    // even the correct code now fails — attempt cap reached
    await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'reset4@test.dev', code: realCode, newPassword: 'newpassword123' })
      .expect(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/server && npx vitest run test/auth.e2e.test.ts -t "Password reset flow"`
Expected: FAIL (routes return 404 — not yet implemented).

- [ ] **Step 3: Add controller handlers**

In `apps/server/src/controllers/authController.ts`, add zod schemas after `LoginSchema`:

```ts
const ForgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});

const ResetPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(72),
});
```

Add handlers after `login`:

```ts
export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = ForgotPasswordSchema.parse(req.body);
    await authService.requestPasswordReset(email);
    res.json({ message: 'If that email exists, a reset code has been sent.' });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const input = ResetPasswordSchema.parse(req.body);
    const result = await authService.resetPassword(input);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 4: Register routes**

In `apps/server/src/routes/auth.ts`, after the `login` route line, add:

```ts
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/server && npx vitest run test/auth.e2e.test.ts`
Expected: PASS (all auth tests including the new reset flow).

- [ ] **Step 6: Run the full server test suite**

Run: `cd apps/server && npx vitest run`
Expected: PASS (no regressions).

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/controllers/authController.ts apps/server/src/routes/auth.ts apps/server/test/auth.e2e.test.ts
git commit -m "feat(server): add forgot-password and reset-password routes"
```

---

## Task 6: Mobile API methods

**Files:**
- Modify: `apps/mobile/services/api.ts:86-92`

- [ ] **Step 1: Add the two methods**

In `apps/mobile/services/api.ts`, extend `authApi`:

```ts
export const authApi = {
  register: (input: { email: string; password: string; displayName: string }) =>
    api.post<{ user: AuthUser; token: string }>('/api/auth/register', input).then((r) => r.data),
  login: (input: { email: string; password: string }) =>
    api.post<{ user: AuthUser; token: string }>('/api/auth/login', input).then((r) => r.data),
  me: () => api.get<AuthUser>('/api/auth/me').then((r) => r.data),
  forgotPassword: (input: { email: string }) =>
    api.post<{ message: string }>('/api/auth/forgot-password', input).then((r) => r.data),
  resetPassword: (input: { email: string; code: string; newPassword: string }) =>
    api.post<{ user: AuthUser; token: string }>('/api/auth/reset-password', input).then((r) => r.data),
};
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/services/api.ts
git commit -m "feat(mobile): add forgotPassword/resetPassword api methods"
```

---

## Task 7: Mobile hooks + forgot-password screen + login link

**Files:**
- Modify: `apps/mobile/hooks/useAuth.ts`
- Create: `apps/mobile/app/(auth)/forgot-password.tsx`
- Modify: `apps/mobile/app/(auth)/login.tsx:80-85`

- [ ] **Step 1: Add hooks**

Append to `apps/mobile/hooks/useAuth.ts`:

```ts
export function useForgotPassword() {
  return useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: () => logger.event('password_reset_requested'),
  });
}

export function useResetPassword() {
  const login = useAuthStore((s) => s.login);
  return useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: async ({ token, user }) => {
      await login(token, user);
      logger.event('password_reset_completed', { userId: user.id });
    },
  });
}
```

- [ ] **Step 2: Create the screen**

Create `apps/mobile/app/(auth)/forgot-password.tsx`:

```tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'expo-router';
import { Pressable, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Field } from '../../components/Field';
import { AmbientGlow } from '../../components/AmbientGlow';
import { useForgotPassword, useResetPassword } from '../../hooks/useAuth';
import { colors, radius, spacing, text, CONTENT_MAX_WIDTH } from '../../utils/theme';

const EmailSchema = z.object({ email: z.string().email('Enter a valid email') });
type EmailInput = z.infer<typeof EmailSchema>;

const ResetSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  newPassword: z.string().min(8, 'At least 8 characters'),
});
type ResetInput = z.infer<typeof ResetSchema>;

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<'request' | 'reset'>('request');

  const forgot = useForgotPassword();
  const reset = useResetPassword();

  const emailForm = useForm<EmailInput>({
    resolver: zodResolver(EmailSchema),
    defaultValues: { email: '' },
  });
  const resetForm = useForm<ResetInput>({
    resolver: zodResolver(ResetSchema),
    defaultValues: { code: '', newPassword: '' },
  });

  const onRequest = (values: EmailInput) =>
    forgot.mutate(values, {
      onSuccess: () => {
        setEmail(values.email);
        setPhase('reset');
      },
    });

  const onReset = (values: ResetInput) =>
    reset.mutate({ email, ...values });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <AmbientGlow />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, padding: spacing.xl, justifyContent: 'center', width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' }}
      >
        <Text style={[text.h1, { marginBottom: spacing.sm }]}>Reset password</Text>

        {phase === 'request' ? (
          <>
            <Text style={[text.muted, { marginBottom: spacing.xl }]}>
              Enter your email and we'll send you a 6-digit reset code.
            </Text>
            <Field
              control={emailForm.control}
              name="email"
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              error={emailForm.formState.errors.email?.message}
            />
            {forgot.isError ? (
              <Text style={[text.muted, { color: colors.danger, marginBottom: spacing.md }]}>
                Something went wrong. Try again.
              </Text>
            ) : null}
            <Pressable
              onPress={emailForm.handleSubmit(onRequest)}
              disabled={forgot.isPending}
              style={({ pressed }) => ({
                backgroundColor: colors.primary,
                paddingVertical: spacing.lg,
                borderRadius: radius.md,
                alignItems: 'center',
                opacity: pressed || forgot.isPending ? 0.7 : 1,
              })}
            >
              <Text style={text.cta}>{forgot.isPending ? 'Sending…' : 'Send code'}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={[text.muted, { marginBottom: spacing.xl }]}>
              We sent a code to {email}. Enter it below with your new password.
            </Text>
            <Field
              control={resetForm.control}
              name="code"
              label="6-digit code"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              error={resetForm.formState.errors.code?.message}
            />
            <Field
              control={resetForm.control}
              name="newPassword"
              label="New password"
              secureTextEntry
              autoCapitalize="none"
              error={resetForm.formState.errors.newPassword?.message}
            />
            {reset.isError ? (
              <Text style={[text.muted, { color: colors.danger, marginBottom: spacing.md }]}>
                Invalid or expired code.
              </Text>
            ) : null}
            <Pressable
              onPress={resetForm.handleSubmit(onReset)}
              disabled={reset.isPending}
              style={({ pressed }) => ({
                backgroundColor: colors.primary,
                paddingVertical: spacing.lg,
                borderRadius: radius.md,
                alignItems: 'center',
                opacity: pressed || reset.isPending ? 0.7 : 1,
              })}
            >
              <Text style={text.cta}>{reset.isPending ? 'Resetting…' : 'Reset password'}</Text>
            </Pressable>
          </>
        )}

        <Link
          href="/(auth)/login"
          style={{ color: colors.primarySoft, fontWeight: '600', textAlign: 'center', marginTop: spacing.lg }}
        >
          Back to sign in
        </Link>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 3: Add the link on the login screen**

In `apps/mobile/app/(auth)/login.tsx`, after the "No account yet?" `View` block (ends at line 85), add:

```tsx
        <Link
          href="/(auth)/forgot-password"
          style={{ color: colors.primarySoft, fontWeight: '600', textAlign: 'center', marginTop: spacing.md }}
        >
          Forgot password?
        </Link>
```

(`Link`, `colors`, `spacing` are already imported in `login.tsx`.)

- [ ] **Step 4: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Start the server (`cd apps/server && npm run dev`) and the app (`cd apps/mobile && npm start`). With `RESEND_API_KEY` unset, the reset code is printed in the server console.
1. On login, tap "Forgot password?".
2. Enter a registered email, tap "Send code".
3. Read the 6-digit code from the server console.
4. Enter code + a new password, tap "Reset password".
Expected: app navigates into the authenticated area (auto-login). Logging out and signing in with the new password works.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/hooks/useAuth.ts apps/mobile/app/(auth)/forgot-password.tsx apps/mobile/app/(auth)/login.tsx
git commit -m "feat(mobile): add forgot-password screen and login link"
```

---

## Task 8: Version bump

**Files:**
- Modify: `apps/mobile/app.config.js:5`
- Modify: `apps/server/package.json` (version field)

- [ ] **Step 1: Bump mobile version**

In `apps/mobile/app.config.js`, change `version: '1.1.12'` to `version: '1.1.13'`.

- [ ] **Step 2: Bump server version**

In `apps/server/package.json`, increment the `version` patch (e.g. `x.y.z` → `x.y.(z+1)`). Check the current value first: `grep '"version"' apps/server/package.json`.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app.config.js apps/server/package.json
git commit -m "chore: bump version for forgot-password feature"
```

---

## Deployment Notes (post-merge, not a code task)

- Set `RESEND_API_KEY` and (optionally) `EMAIL_FROM` in the server `.env` on the DigitalOcean droplet.
- Verify the `shishir.cloud` sending domain in Resend (add the SPF + DKIM DNS records Resend provides).
- JS-only mobile changes ship via EAS Update (OTA), not a new APK build.

---

## Final Verification

- [ ] `cd apps/server && npx vitest run` — all pass.
- [ ] `cd apps/server && npx tsc --noEmit` — clean.
- [ ] `cd apps/mobile && npx tsc --noEmit` — clean.
- [ ] Manual reset flow (Task 7 Step 5) works end to end.
