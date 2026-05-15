import { Platform } from 'react-native';
import Constants from 'expo-constants';

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

// userId resolved lazily at flush time to avoid circular import
let getUserId: (() => string | undefined) | null = null;
export function setLoggerUserIdResolver(fn: () => string | undefined) {
  getUserId = fn;
}

class Logger {
  private queue: LogEntry[] = [];

  constructor() {
    setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
  }

  private buildEntry(level: LogLevel, message: string, data?: Record<string, unknown>): LogEntry {
    return {
      level,
      message,
      data,
      userId: getUserId?.(),
      appVersion: APP_VERSION,
      platform: PLATFORM,
      timestamp: new Date().toISOString(),
    };
  }

  error(message: string, data?: Record<string, unknown>) {
    this.queue.push(this.buildEntry('error', message, data));
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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      await fetch(`${API_URL}/api/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: batch }),
        signal: controller.signal,
      });
    } catch {
      // Fire-and-forget — never rethrow, never block UI
    } finally {
      clearTimeout(timer);
    }
  }
}

export const logger = new Logger();
