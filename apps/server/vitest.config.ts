import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    // Mongoose models are module-global singletons; running suites in a
    // single fork avoids "model already compiled" + shared-connection races.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    hookTimeout: 60_000, // first run downloads the in-memory mongod binary
    testTimeout: 20_000,
    // Env the config schema (src/lib/config.ts) requires at import time.
    env: {
      NODE_ENV: 'test',
      MONGO_URI: 'mongodb://127.0.0.1:27017/placeholder', // overridden by memory server
      JWT_SECRET: 'test-secret-at-least-16-chars-long',
      JWT_EXPIRES_IN: '1h',
      CORS_ORIGIN: '*',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/seed.ts', 'src/types/**', 'src/**/*.d.ts'],
    },
  },
});
