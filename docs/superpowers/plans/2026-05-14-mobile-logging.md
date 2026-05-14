# Mobile Logging & Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship structured logs (crashes, API errors, user events) from the mobile app to a MongoDB-backed `/api/logs` endpoint so white-screen crashes and user flows are observable.

**Architecture:** Mobile `logger.ts` singleton queues entries and flushes them in batches to `POST /api/logs`. The server stores them in a TTL-indexed `logs` MongoDB collection. Global JS error handler + React ErrorBoundary + axios interceptor auto-capture failures; manual `logger.event()` calls track key user actions.

**Tech Stack:** React Native (Expo SDK 54), Zustand, Axios, Express, Mongoose, express-rate-limit

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `apps/mobile/services/logger.ts` | Create | Logger singleton — queue, flush, level methods |
| `apps/mobile/components/ErrorBoundary.tsx` | Create | React error boundary — catches render errors, shows fallback |
| `apps/mobile/app/_layout.tsx` | Modify | Wire ErrorBoundary + ErrorUtils global handler |
| `apps/mobile/services/api.ts` | Modify | Axios response interceptor — log all API errors |
| `apps/mobile/hooks/useAuth.ts` | Modify | Log register/login success events |
| `apps/mobile/hooks/useVote.ts` | Modify | Log vote cast events |
| `apps/mobile/app/(app)/submit.tsx` | Modify | Log gem submitted event |
| `apps/server/src/models/Log.ts` | Create | Mongoose Log model with TTL index |
| `apps/server/src/routes/logs.ts` | Create | POST /api/logs + GET /api/logs |
| `apps/server/src/app.ts` | Modify | Register /api/logs route |

---

## Task 1: Create Log model on server

**Files:**
- Create: `apps/server/src/models/Log.ts`

- [ ] **Step 1: Create the Log model**

```typescript
// apps/server/src/models/Log.ts
import mongoose, { type Document, type Model } from 'mongoose';

export interface ILog extends Document {
  level: 'error' | 'warn' | 'info' | 'event';
  message: string;
  data?: Record<string, unknown>;
  userId?: string;
  appVersion: string;
  platform: 'ios' | 'android' | 'web';
  timestamp: Date;
  createdAt: Date;
}

const LogSchema = new mongoose.Schema<ILog>(
  {
    level: { type: String, enum: ['error', 'warn', 'info', 'event'], required: true },
    message: { type: String, required: true, maxlength: 1000 },
    data: { type: mongoose.Schema.Types.Mixed },
    userId: { type: String, index: true },
    appVersion: { type: String, required: true, maxlength: 20 },
    platform: { type: String, enum: ['ios', 'android', 'web'], required: true },
    timestamp: { type: Date, required: true, index: true },
  },
  {
    timestamps: true,
  }
);

// Auto-delete logs older than 30 days
LogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const Log: Model<ILog> = mongoose.model<ILog>('Log', LogSchema);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/server && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/models/Log.ts
git commit -m "feat(server): add Log mongoose model with 30d TTL"
```

---

## Task 2: Create logs route on server

**Files:**
- Create: `apps/server/src/routes/logs.ts`

- [ ] **Step 1: Create the logs route**

```typescript
// apps/server/src/routes/logs.ts
import { Router, type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { Log } from '../models/Log';
import { requireAuth } from '../middleware/authenticate';

const router = Router();

const logsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many log submissions' },
});

const LogEntrySchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'event']),
  message: z.string().min(1).max(1000),
  data: z.record(z.unknown()).optional(),
  userId: z.string().optional(),
  appVersion: z.string().max(20),
  platform: z.enum(['ios', 'android', 'web']),
  timestamp: z.string().datetime(),
});

const LogBatchSchema = z.object({
  logs: z.array(LogEntrySchema).min(1).max(50),
});

router.post('/', logsLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = LogBatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(200).json({ ok: true, dropped: req.body?.logs?.length ?? 0 });
      return;
    }

    const docs = parsed.data.logs.map((entry) => ({
      ...entry,
      timestamp: new Date(entry.timestamp),
    }));

    await Log.insertMany(docs, { ordered: false });
    res.status(200).json({ ok: true, saved: docs.length });
  } catch (err) {
    // insertMany partial failure is acceptable — still return 200
    res.status(200).json({ ok: true });
  }
});

router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { level, userId, from, to, limit } = req.query;

    const filter: Record<string, unknown> = {};
    if (level) filter.level = level;
    if (userId) filter.userId = userId;
    if (from || to) {
      filter.timestamp = {};
      if (from) (filter.timestamp as Record<string, unknown>).$gte = new Date(from as string);
      if (to) (filter.timestamp as Record<string, unknown>).$lte = new Date(to as string);
    }

    const parsedLimit = Math.min(Number(limit) || 100, 500);

    const logs = await Log.find(filter)
      .sort({ timestamp: -1 })
      .limit(parsedLimit)
      .lean();

    res.json({ items: logs, count: logs.length });
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 2: Register the route in app.ts**

In `apps/server/src/app.ts`, add after the existing imports:
```typescript
import logsRoutes from './routes/logs';
```

And after the existing `app.use('/api/places', placesRoutes);` line:
```typescript
app.use('/api/logs', logsRoutes);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/server && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Smoke test locally**

```bash
# Start server
cd apps/server && npm run dev &
sleep 2

# POST a test log
curl -s -X POST http://localhost:4000/api/logs \
  -H "Content-Type: application/json" \
  -d '{"logs":[{"level":"info","message":"test","appVersion":"1.0.0","platform":"android","timestamp":"2026-05-14T10:00:00.000Z"}]}'
```
Expected: `{"ok":true,"saved":1}`

- [ ] **Step 5: Bump version and commit**

In `apps/server/package.json`, bump `"version"` to `"0.2.0"`.

```bash
git add apps/server/src/routes/logs.ts apps/server/src/app.ts apps/server/package.json
git commit -m "feat(server): add POST/GET /api/logs endpoint"
```

---

## Task 3: Deploy updated server to VM

**Files:** None (deployment)

- [ ] **Step 1: Build server**

```bash
cd apps/server && npm run build
```
Expected: no errors, `dist/` updated

- [ ] **Step 2: Rsync to droplet**

```bash
rsync -az --exclude 'node_modules' --exclude '.env' --exclude 'src' \
  apps/server/ root@168.144.80.224:/opt/local-legend-api/
```

- [ ] **Step 3: Install deps and restart on droplet**

```bash
ssh root@168.144.80.224 "cd /opt/local-legend-api && npm install --omit=dev && pm2 restart local-legend-api"
```

- [ ] **Step 4: Verify live endpoint**

```bash
curl -s -X POST https://shishir.cloud/api/logs \
  -H "Content-Type: application/json" \
  -d '{"logs":[{"level":"info","message":"deploy-check","appVersion":"1.0.0","platform":"android","timestamp":"2026-05-14T10:00:00.000Z"}]}'
```
Expected: `{"ok":true,"saved":1}`

---

## Task 4: Create mobile logger service

**Files:**
- Create: `apps/mobile/services/logger.ts`

- [ ] **Step 1: Create logger.ts**

```typescript
// apps/mobile/services/logger.ts
import { AppState, type AppStateStatus, Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuthStore } from '../stores/authStore';

type LogLevel = 'error' | 'warn' | 'info' | 'event';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  userId?: string;
  appVersion: string;
  platform: 'ios' | 'android' | 'web';
  timestamp: string;
}

const API_URL =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  'http://localhost:4000';

const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';
const PLATFORM = (Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web') as LogEntry['platform'];
const FLUSH_INTERVAL_MS = 10_000;

class Logger {
  private queue: LogEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
    AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        this.flush();
      }
    });
  }

  private buildEntry(level: LogLevel, message: string, data?: Record<string, unknown>): LogEntry {
    return {
      level,
      message,
      data,
      userId: useAuthStore.getState().user?.id ?? undefined,
      appVersion: APP_VERSION,
      platform: PLATFORM,
      timestamp: new Date().toISOString(),
    };
  }

  error(message: string, data?: Record<string, unknown>) {
    const entry = this.buildEntry('error', message, data);
    this.queue.push(entry);
    // Flush immediately on errors
    this.flush();
  }

  warn(message: string, data?: Record<string, unknown>) {
    this.queue.push(this.buildEntry('warn', message, data));
  }

  info(message: string, data?: Record<string, unknown>) {
    this.queue.push(this.buildEntry('info', message, data));
  }

  event(message: string, data?: Record<string, unknown>) {
    this.queue.push(this.buildEntry('event', message, data));
  }

  async flush() {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, 50);
    try {
      await fetch(`${API_URL}/api/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: batch }),
      });
    } catch {
      // Fire-and-forget — never rethrow, never block UI
    }
  }
}

export const logger = new Logger();
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/mobile && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/services/logger.ts
git commit -m "feat(mobile): add logger singleton with queue and flush"
```

---

## Task 5: Create ErrorBoundary component

**Files:**
- Create: `apps/mobile/components/ErrorBoundary.tsx`

- [ ] **Step 1: Create ErrorBoundary.tsx**

```typescript
// apps/mobile/components/ErrorBoundary.tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { colors, spacing, text } from '../utils/theme';
import { logger } from '../services/logger';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error('React render error', {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack ?? undefined,
    });
  }

  render() {
    if (this.state.error) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: colors.bg,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.xl,
          }}
        >
          <Text style={[text.h2, { marginBottom: spacing.md }]}>Something went wrong</Text>
          <Text style={[text.muted, { marginBottom: spacing.xl, textAlign: 'center' }]}>
            {this.state.error.message}
          </Text>
          <Pressable
            onPress={() => this.setState({ error: null })}
            style={{
              backgroundColor: colors.primary,
              paddingVertical: spacing.lg,
              paddingHorizontal: spacing.xl,
              borderRadius: 12,
            }}
          >
            <Text style={text.cta}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/mobile && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/ErrorBoundary.tsx
git commit -m "feat(mobile): add ErrorBoundary component with crash reporting"
```

---

## Task 6: Wire error capture into root layout

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Update _layout.tsx**

Replace the full file content:

```typescript
// apps/mobile/app/_layout.tsx
import { useEffect } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '../services/queryClient';
import { useAuthStore } from '../stores/authStore';
import { colors } from '../utils/theme';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { logger } from '../services/logger';

// Catch unhandled JS crashes before React renders
const prevHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
  logger.error(error.message, { stack: error.stack, isFatal: isFatal ?? false });
  prevHandler?.(error, isFatal);
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isHydrated) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!token && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [token, isHydrated, segments, router]);

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" />
          <AuthGate>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(app)" />
            </Stack>
          </AuthGate>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/mobile && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): wire ErrorBoundary and global JS error handler"
```

---

## Task 7: Add axios interceptor for API error logging

**Files:**
- Modify: `apps/mobile/services/api.ts`

- [ ] **Step 1: Add logger import and error interceptor**

In `apps/mobile/services/api.ts`, add the logger import after the existing imports:
```typescript
import { logger } from './logger';
```

Then in the existing response interceptor (the `(err: AxiosError<...>)` handler), add logging before the `return Promise.reject(err)` line:

```typescript
  (err: AxiosError<{ error?: string }>) => {
    logger.error('API error', {
      url: err.config?.url,
      method: err.config?.method,
      status: err.response?.status,
      responseBody: err.response?.data,
    });
    if (err.response?.status === 401) {
      const token = useAuthStore.getState().token;
      if (token) useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  }
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/mobile && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/services/api.ts
git commit -m "feat(mobile): log all API errors via axios interceptor"
```

---

## Task 8: Log key user events

**Files:**
- Modify: `apps/mobile/hooks/useAuth.ts`
- Modify: `apps/mobile/hooks/useVote.ts`
- Modify: `apps/mobile/app/(app)/submit.tsx`

- [ ] **Step 1: Add events to useAuth.ts**

Replace `apps/mobile/hooks/useAuth.ts`:

```typescript
// apps/mobile/hooks/useAuth.ts
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { logger } from '../services/logger';

export function useLogin() {
  const login = useAuthStore((s) => s.login);
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: async ({ token, user }) => {
      await login(token, user);
      logger.event('user_login', { userId: user.id });
    },
  });
}

export function useRegister() {
  const login = useAuthStore((s) => s.login);
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: async ({ token, user }) => {
      await login(token, user);
      logger.event('user_register', { userId: user.id });
    },
  });
}
```

- [ ] **Step 2: Add vote event to useVote.ts**

Read `apps/mobile/hooks/useVote.ts` and add to its `onSuccess`:
```typescript
import { logger } from './logger'; // add at top — adjust relative path if needed
```

In the `onSuccess` callback of the mutation, add:
```typescript
logger.event('vote_cast', { gemId, voted: data.voted });
```

- [ ] **Step 3: Add gem submit event to submit.tsx**

In `apps/mobile/app/(app)/submit.tsx`, add import at top:
```typescript
import { logger } from '../../services/logger';
```

In the `onSuccess` callback of the create mutation, add:
```typescript
logger.event('gem_submitted', { gemId: gem.id, name: gem.name });
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd apps/mobile && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 5: Bump version and commit**

In `apps/mobile/app.config.js` change `version: '1.0.0'` → `version: '1.1.0'`.
In `apps/mobile/package.json` change `"version": "1.0.0"` → `"version": "1.1.0"`.
In `apps/mobile/app.config.js` change `versionCode: 1` → `versionCode: 2`.

```bash
git add apps/mobile/hooks/useAuth.ts apps/mobile/hooks/useVote.ts \
  apps/mobile/app/\(app\)/submit.tsx apps/mobile/app.config.js apps/mobile/package.json
git commit -m "feat(mobile): add observability — crash reporting, API error logging, user events"
```

---

## Task 9: Build and deploy preview APK to verify white screen is fixed

- [ ] **Step 1: Build preview APK**

```bash
cd apps/mobile && eas build --platform android --profile preview --non-interactive
```

- [ ] **Step 2: Install on device and open app**

Download the APK from the EAS link and install on Android.

- [ ] **Step 3: Check logs on server**

```bash
curl -s "https://shishir.cloud/api/logs?limit=20" \
  -H "Authorization: Bearer <your-token>"
```

If the white screen was a JS crash, you will see `level: "error"` entries with the stack trace — identifying the root cause.

If the app opens cleanly, check for `level: "event"` entries on registration and login to confirm the full pipeline works.
