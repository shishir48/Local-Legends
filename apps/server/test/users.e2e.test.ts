import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, auth, makeUser, gemPayload } from './helpers';

describe('PATCH /api/users/me', () => {
  it('updates the display name', async () => {
    const u = await makeUser();
    const res = await request(app)
      .patch('/api/users/me')
      .set(auth(u.token))
      .send({ displayName: 'New Name' })
      .expect(200);
    expect(res.body.displayName).toBe('New Name');
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('rejects an over-long display name (400)', async () => {
    const u = await makeUser();
    await request(app)
      .patch('/api/users/me')
      .set(auth(u.token))
      .send({ displayName: 'x'.repeat(51) })
      .expect(400);
  });

  it('requires auth', async () => {
    await request(app).patch('/api/users/me').send({ displayName: 'x' }).expect(401);
  });
});

describe('GET /api/users/:id/gems', () => {
  it('returns a submitter’s gems with totalUpvotes', async () => {
    const owner = await makeUser();
    const voter = await makeUser();

    const g1 = await request(app).post('/api/gems').set(auth(owner.token)).send(gemPayload({ name: 'A' })).expect(201);
    await request(app).post('/api/gems').set(auth(owner.token)).send(gemPayload({ name: 'B' })).expect(201);
    await request(app).post(`/api/gems/${g1.body.id}/vote`).set(auth(voter.token)).expect(200);

    const res = await request(app).get(`/api/users/${owner.id}/gems`).expect(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.totalUpvotes).toBe(1);
    expect(res.body.items.every((g: { id: string }) => typeof g.id === 'string')).toBe(true);
  });

  it('returns the submitter’s public profile, without email', async () => {
    const owner = await makeUser();
    const res = await request(app).get(`/api/users/${owner.id}/gems`).expect(200);
    expect(res.body.user).toEqual({
      id: owner.id,
      displayName: expect.any(String),
      avatarUrl: null,
    });
    expect(res.body.user.email).toBeUndefined();
  });

  it('returns 404 for a non-existent user id', async () => {
    await request(app).get('/api/users/64b8f0f0f0f0f0f0f0f0f0f0/gems').expect(404);
  });

  it('rejects a malformed user id (400)', async () => {
    await request(app).get('/api/users/nope/gems').expect(400);
  });
});
