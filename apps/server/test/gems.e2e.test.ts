import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, auth, makeUser, gemPayload } from './helpers';

async function createGem(token: string, overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post('/api/gems')
    .set(auth(token))
    .send(gemPayload(overrides))
    .expect(201);
  return res.body;
}

describe('gems full lifecycle (e2e)', () => {
  it('register → create → list → detail → vote → update → delete', async () => {
    const owner = await makeUser();

    // create
    const gem = await createGem(owner.token, { name: 'Filter Coffee Spot' });
    expect(gem.id).toBeTypeOf('string');
    expect(gem.voteCount).toBe(0);
    expect(gem.location.coordinates).toEqual([80.2707, 13.0827]);

    // list
    const list = await request(app).get('/api/gems').expect(200);
    expect(list.body.total).toBe(1);
    expect(list.body.items[0].id).toBe(gem.id);

    // detail (anon → hasVoted false)
    const detail = await request(app).get(`/api/gems/${gem.id}`).expect(200);
    expect(detail.body.hasVoted).toBe(false);

    // vote by a second user
    const voter = await makeUser();
    const v1 = await request(app).post(`/api/gems/${gem.id}/vote`).set(auth(voter.token)).expect(200);
    expect(v1.body).toEqual({ voted: true, voteCount: 1 });

    // detail as voter → hasVoted true
    const detailVoted = await request(app).get(`/api/gems/${gem.id}`).set(auth(voter.token)).expect(200);
    expect(detailVoted.body.hasVoted).toBe(true);

    // unvote
    const v2 = await request(app).post(`/api/gems/${gem.id}/vote`).set(auth(voter.token)).expect(200);
    expect(v2.body).toEqual({ voted: false, voteCount: 0 });

    // update by owner
    const updated = await request(app)
      .patch(`/api/gems/${gem.id}`)
      .set(auth(owner.token))
      .send({ name: 'Renamed Spot', city: 'Mumbai' })
      .expect(200);
    expect(updated.body.name).toBe('Renamed Spot');
    expect(updated.body.city).toBe('Mumbai');

    // delete by owner
    await request(app).delete(`/api/gems/${gem.id}`).set(auth(owner.token)).expect(204);

    // gone from list + 404 on detail
    const after = await request(app).get('/api/gems').expect(200);
    expect(after.body.total).toBe(0);
    await request(app).get(`/api/gems/${gem.id}`).expect(404);
  });
});

describe('gems auth + ownership gating', () => {
  it('requires auth to create', async () => {
    await request(app).post('/api/gems').send(gemPayload()).expect(401);
  });

  it('requires auth to vote', async () => {
    const owner = await makeUser();
    const gem = await createGem(owner.token);
    await request(app).post(`/api/gems/${gem.id}/vote`).expect(401);
  });

  it('forbids updating someone else’s gem (403)', async () => {
    const owner = await makeUser();
    const stranger = await makeUser();
    const gem = await createGem(owner.token);
    await request(app)
      .patch(`/api/gems/${gem.id}`)
      .set(auth(stranger.token))
      .send({ name: 'Hijacked' })
      .expect(403);
  });

  it('forbids deleting someone else’s gem (403)', async () => {
    const owner = await makeUser();
    const stranger = await makeUser();
    const gem = await createGem(owner.token);
    await request(app).delete(`/api/gems/${gem.id}`).set(auth(stranger.token)).expect(403);
  });
});

describe('gems validation', () => {
  it('rejects an invalid category (400)', async () => {
    const owner = await makeUser();
    await request(app)
      .post('/api/gems')
      .set(auth(owner.token))
      .send(gemPayload({ category: 'spaceship' }))
      .expect(400);
  });

  it('rejects out-of-range coordinates (400)', async () => {
    const owner = await makeUser();
    await request(app)
      .post('/api/gems')
      .set(auth(owner.token))
      .send(gemPayload({ lat: 999 }))
      .expect(400);
  });

  it('rejects a malformed gem id (400)', async () => {
    await request(app).get('/api/gems/not-a-valid-id').expect(400);
  });

  it('returns 404 for a well-formed but missing id', async () => {
    await request(app).get('/api/gems/64b8f0000000000000000000').expect(404);
  });
});

describe('GET /api/gems pagination & filters', () => {
  it('paginates and filters by category', async () => {
    const owner = await makeUser();
    await createGem(owner.token, { category: 'food', name: 'F1' });
    await createGem(owner.token, { category: 'food', name: 'F2' });
    await createGem(owner.token, { category: 'bar', name: 'B1' });

    const page1 = await request(app).get('/api/gems').query({ limit: 2, page: 1 }).expect(200);
    expect(page1.body.items).toHaveLength(2);
    expect(page1.body.pages).toBe(2);

    const food = await request(app).get('/api/gems').query({ category: 'food' }).expect(200);
    expect(food.body.total).toBe(2);
  });
});
