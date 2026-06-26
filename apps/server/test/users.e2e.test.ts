import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, auth, makeUser, gemPayload } from './helpers';
import { User } from '../src/models/User';

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

  it('returns public profile with followersCount, followingCount, without email', async () => {
    const owner = await makeUser();
    const res = await request(app).get(`/api/users/${owner.id}/gems`).expect(200);
    expect(res.body.user).toMatchObject({
      id: owner.id,
      displayName: expect.any(String),
      avatarUrl: null,
      followersCount: expect.any(Number),
      followingCount: expect.any(Number),
    });
    expect(res.body.user.email).toBeUndefined();
  });

  it('returns 404 for a non-existent user id', async () => {
    await request(app).get('/api/users/64b8f0f0f0f0f0f0f0f0f0f0/gems').expect(404);
  });

  it('rejects a malformed user id (400)', async () => {
    await request(app).get('/api/users/nope/gems').expect(400);
  });

  it('includes isFollowing when the viewer is logged in', async () => {
    const owner = await makeUser({ displayName: 'Alice' });
    const viewer = await makeUser({ displayName: 'Bob' });

    const res = await request(app)
      .get(`/api/users/${owner.id}/gems`)
      .set(auth(viewer.token))
      .expect(200);
    expect(res.body.isFollowing).toBe(false);
  });
});

describe('POST /api/users/:id/follow', () => {
  it('toggles follow on/off and returns updated counts', async () => {
    const owner = await makeUser();
    const follower = await makeUser();

    // follow
    const res1 = await request(app)
      .post(`/api/users/${owner.id}/follow`)
      .set(auth(follower.token))
      .expect(200);
    expect(res1.body).toEqual({ following: true, followersCount: 1 });

    // verify isFollowing in profile
    const profile = await request(app)
      .get(`/api/users/${owner.id}/gems`)
      .set(auth(follower.token))
      .expect(200);
    expect(profile.body.isFollowing).toBe(true);

    // unfollow
    const res2 = await request(app)
      .post(`/api/users/${owner.id}/follow`)
      .set(auth(follower.token))
      .expect(200);
    expect(res2.body).toEqual({ following: false, followersCount: 0 });
  });

  it('blocks self-follow (400)', async () => {
    const u = await makeUser();
    await request(app)
      .post(`/api/users/${u.id}/follow`)
      .set(auth(u.token))
      .expect(400);
  });

  it('requires auth', async () => {
    const u = await makeUser();
    await request(app).post(`/api/users/${u.id}/follow`).expect(401);
  });

  it('returns 404 for a non-existent user', async () => {
    const u = await makeUser();
    await request(app)
      .post('/api/users/64b8f0f0f0f0f0f0f0f0f0f0/follow')
      .set(auth(u.token))
      .expect(404);
  });
});

describe('GET /api/users/:id/followers', () => {
  it('returns an empty list for a user with no followers', async () => {
    const u = await makeUser();
    const res = await request(app).get(`/api/users/${u.id}/followers`).expect(200);
    expect(res.body.items).toEqual([]);
  });

  it('returns followers after a follow', async () => {
    const owner = await makeUser();
    const follower = await makeUser();
    await request(app).post(`/api/users/${owner.id}/follow`).set(auth(follower.token)).expect(200);

    const res = await request(app).get(`/api/users/${owner.id}/followers`).expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]._id).toBe(follower.id);
    expect(res.body.items[0].displayName).toBe(follower.displayName);
  });

  it('returns 404 for a non-existent user', async () => {
    await request(app).get('/api/users/64b8f0f0f0f0f0f0f0f0f0f0/followers').expect(404);
  });

  it('rejects a malformed user id (400)', async () => {
    await request(app).get('/api/users/nope/followers').expect(400);
  });
});

describe('GET /api/users/:id/following', () => {
  it('returns an empty list for a user following no one', async () => {
    const u = await makeUser();
    const res = await request(app).get(`/api/users/${u.id}/following`).expect(200);
    expect(res.body.items).toEqual([]);
  });

  it('returns the users a user is following after a follow', async () => {
    const owner = await makeUser();
    const follower = await makeUser();
    await request(app).post(`/api/users/${owner.id}/follow`).set(auth(follower.token)).expect(200);

    const res = await request(app).get(`/api/users/${follower.id}/following`).expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]._id).toBe(owner.id);
    expect(res.body.items[0].displayName).toBe(owner.displayName);
  });

  it('returns 404 for a non-existent user', async () => {
    await request(app).get('/api/users/64b8f0f0f0f0f0f0f0f0f0f0/following').expect(404);
  });

  it('rejects a malformed user id (400)', async () => {
    await request(app).get('/api/users/nope/following').expect(400);
  });
});
