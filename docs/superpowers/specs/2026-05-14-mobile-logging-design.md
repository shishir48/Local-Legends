# Mobile Logging & Observability

**Date:** 2026-05-14  
**Status:** Approved

## Goal

Ship structured logs from the mobile app to the Node.js server so crashes, API errors, and key user events are visible and queryable — replacing the current "white screen, no idea why" situation.

## Architecture

Two pieces: a mobile `logger` service that captures and ships log entries, and a server `logs` endpoint + MongoDB collection that receives and stores them.

```
Mobile App
  └── ErrorBoundary (render crashes)
  └── ErrorUtils handler (JS crashes)
  └── axios interceptor (API errors)
  └── manual logger.event() calls
        └── logger.ts (queue + flush every 10s)
              └── POST /api/logs
                    └── MongoDB `logs` collection
```

## Log Entry Schema

```ts
{
  level: 'error' | 'warn' | 'info' | 'event',
  message: string,
  data?: Record<string, unknown>,   // error stack, request details, event payload
  userId?: string,                   // from auth store if logged in
  appVersion: string,                // from expo-constants
  platform: 'ios' | 'android',
  timestamp: string,                 // ISO 8601
}
```

## Mobile: `services/logger.ts`

- Singleton module, no React dependency
- Internal queue: `LogEntry[]`
- `logger.error(message, data?)` — level: error
- `logger.warn(message, data?)` — level: warn  
- `logger.info(message, data?)` — level: info
- `logger.event(message, data?)` — level: event (user actions)
- Flush strategy: every 10 seconds via `setInterval`, or immediately on `level === 'error'`, or on app going to background (`AppState` listener)
- Flush: POST batch to `/api/logs` with `{ logs: LogEntry[] }`. Fire-and-forget (never throws, never blocks UI)
- userId injected at flush time from `useAuthStore.getState().user?.id`

## Mobile: Error Capture Hooks

**1. Global JS crash handler** — in `app/_layout.tsx` root:
```ts
ErrorUtils.setGlobalHandler((error, isFatal) => {
  logger.error(error.message, { stack: error.stack, isFatal });
});
```

**2. React ErrorBoundary** — wraps `<Stack>` in root layout, catches render errors, shows fallback UI with error message instead of white screen.

**3. Axios interceptor** — in `services/api.ts`, on response error:
```ts
logger.error('API error', {
  url: err.config?.url,
  method: err.config?.method,
  status: err.response?.status,
  body: err.response?.data,
});
```

**4. Manual events** — call `logger.event()` at:
- Successful registration / login
- Gem submitted
- Vote cast
- Photo upload

## Server: `POST /api/logs`

- Route: `apps/server/src/routes/logs.ts`
- No auth required (app logs before login)
- Rate limited: 20 req/min per IP (new `logsLimiter`)
- Body: `{ logs: LogEntry[] }`, max 50 entries per batch
- Validates entries, drops malformed ones silently
- Bulk inserts valid entries into `logs` MongoDB collection
- Always returns `200 { ok: true }` — client never retries on error

## Server: `GET /api/logs`

- Auth required (`requireAuth`)
- Query params: `level`, `userId`, `from`, `to`, `limit` (default 100, max 500)
- Returns logs sorted by `timestamp` desc
- Used for debugging — no UI, just curl/Mongo queries for now

## MongoDB: `Log` Model

```ts
{
  level: String (enum),
  message: String,
  data: Mixed,
  userId: String (optional, indexed),
  appVersion: String,
  platform: String,
  timestamp: Date (indexed),
  createdAt: Date (TTL index: 30 days auto-delete)
}
```

TTL index auto-purges logs older than 30 days — no manual cleanup needed.

## What This Fixes Immediately

The white screen bug: `ErrorUtils.setGlobalHandler` + `ErrorBoundary` will capture the startup crash and ship it to the server before the app dies. Next preview build will show exactly what's failing.

## Out of Scope

- Log viewer UI (query via curl/Mongo for now)
- Log levels filtering on client (send everything, filter server-side)
- Offline queue persistence (in-memory queue is sufficient; logs lost on force-quit are acceptable)
