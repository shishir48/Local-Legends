import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, auth, makeUser } from './helpers';
import { User } from '../src/models/User';
import { Log } from '../src/models/Log';

function entry(overrides: Record<string, unknown> = {}) {
  return {
    level: 'info',
    message: 'hello',
    appVersion: '1.0.0',
    platform: 'android',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe('POST /api/logs (public ingest)', () => {
  it('accepts a valid batch and persists it', async () => {
    const res = await request(app).post('/api/logs').send({ logs: [entry(), entry({ level: 'error' })] }).expect(200);
    expect(res.body).toEqual({ ok: true, saved: 2 });
    expect(await Log.countDocuments()).toBe(2);
  });

  it('silently drops an invalid batch with 200 (never blocks the client)', async () => {
    const res = await request(app)
      .post('/api/logs')
      .send({ logs: [{ level: 'nope', message: '' }] })
      .expect(200);
    expect(res.body.ok).toBe(true);
    expect(await Log.countDocuments()).toBe(0);
  });
});

describe('GET /api/logs (admin only)', () => {
  it('rejects anonymous callers with 401', async () => {
    await request(app).get('/api/logs').expect(401);
  });

  it('rejects a normal authenticated user with 403 (privacy regression)', async () => {
    const u = await makeUser();
    const res = await request(app).get('/api/logs').set(auth(u.token)).expect(403);
    expect(res.body.error).toMatch(/admin/i);
  });

  it('allows an admin and returns stored logs', async () => {
    await request(app).post('/api/logs').send({ logs: [entry({ message: 'visible' })] }).expect(200);

    const adminUser = await makeUser();
    await User.findByIdAndUpdate(adminUser.id, { isAdmin: true });

    const res = await request(app).get('/api/logs').set(auth(adminUser.token)).expect(200);
    expect(res.body.count).toBe(1);
    expect(res.body.items[0].message).toBe('visible');
  });

  it('lets an admin filter by level', async () => {
    await request(app)
      .post('/api/logs')
      .send({ logs: [entry({ level: 'error', message: 'boom' }), entry({ level: 'info', message: 'fyi' })] })
      .expect(200);

    const admin = await makeUser();
    await User.findByIdAndUpdate(admin.id, { isAdmin: true });

    const res = await request(app).get('/api/logs').query({ level: 'error' }).set(auth(admin.token)).expect(200);
    expect(res.body.count).toBe(1);
    expect(res.body.items[0].message).toBe('boom');
  });
});
