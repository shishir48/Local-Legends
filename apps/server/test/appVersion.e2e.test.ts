import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './helpers';

describe('GET /api/app-version', () => {
  it('returns the latest runtime version and store url (no auth)', async () => {
    const res = await request(app).get('/api/app-version').expect(200);
    expect(typeof res.body.latestRuntimeVersion).toBe('string');
    expect(res.body.latestRuntimeVersion.length).toBeGreaterThan(0);
    expect(res.body.androidStoreUrl).toContain('com.shishir48.locallegend');
  });
});
