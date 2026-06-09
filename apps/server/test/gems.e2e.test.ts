import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, auth, makeUser, gemPayload } from './helpers';
import { User } from '../src/models/User';
import { ensureAdminUser } from '../src/lib/ensureAdmin';

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

  it('lets an admin delete someone else’s gem (204)', async () => {
    const owner = await makeUser();
    const admin = await makeUser();
    await User.updateOne({ _id: admin.id }, { $set: { isAdmin: true } });
    const gem = await createGem(owner.token);
    await request(app).delete(`/api/gems/${gem.id}`).set(auth(admin.token)).expect(204);
    // gem is gone from the public listing
    await request(app).get(`/api/gems/${gem.id}`).expect(404);
  });
});

describe('ensureAdminUser', () => {
  it('promotes the ADMIN_EMAIL user to admin, idempotently', async () => {
    const u = await makeUser();
    process.env.ADMIN_EMAIL = u.email;
    try {
      await ensureAdminUser();
      let doc = await User.findById(u.id).select('isAdmin').lean();
      expect(doc?.isAdmin).toBe(true);
      // second run is a harmless no-op
      await ensureAdminUser();
      doc = await User.findById(u.id).select('isAdmin').lean();
      expect(doc?.isAdmin).toBe(true);
    } finally {
      delete process.env.ADMIN_EMAIL;
    }
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

describe('gems comments', () => {
  it('lists comments for a gem (empty)', async () => {
    const owner = await makeUser();
    const gem = await createGem(owner.token);

    const res = await request(app).get(`/api/gems/${gem.id}/comments`).expect(200);
    expect(res.body.items).toEqual([]);
  });

  it('creates, lists, and deletes a comment', async () => {
    const owner = await makeUser();
    const gem = await createGem(owner.token);

    // create
    const c1 = await request(app)
      .post(`/api/gems/${gem.id}/comments`)
      .set(auth(owner.token))
      .send({ text: 'Great spot!' })
      .expect(201);
    expect(c1.body.text).toBe('Great spot!');
    expect(c1.body.user.displayName).toBe(owner.displayName);

    // second user comments
    const other = await makeUser();
    await request(app)
      .post(`/api/gems/${gem.id}/comments`)
      .set(auth(other.token))
      .send({ text: 'Second comment' })
      .expect(201);

    // list (newest first)
    const list = await request(app).get(`/api/gems/${gem.id}/comments`).expect(200);
    expect(list.body.items).toHaveLength(2);
    expect(list.body.items[0].text).toBe('Second comment');
    expect(list.body.items[1].text).toBe('Great spot!');

    // delete own comment
    await request(app)
      .delete(`/api/gems/${gem.id}/comments/${c1.body.id}`)
      .set(auth(owner.token))
      .expect(204);

    const after = await request(app).get(`/api/gems/${gem.id}/comments`).expect(200);
    expect(after.body.items).toHaveLength(1);
  });

  it('requires auth to create a comment', async () => {
    const owner = await makeUser();
    const gem = await createGem(owner.token);
    await request(app).post(`/api/gems/${gem.id}/comments`).send({ text: 'nope' }).expect(401);
  });

  it('forbids deleting someone else’s comment (403)', async () => {
    const owner = await makeUser();
    const other = await makeUser();
    const gem = await createGem(owner.token);

    const c = await request(app)
      .post(`/api/gems/${gem.id}/comments`)
      .set(auth(owner.token))
      .send({ text: 'mine' })
      .expect(201);

    await request(app)
      .delete(`/api/gems/${gem.id}/comments/${c.body.id}`)
      .set(auth(other.token))
      .expect(403);
  });

  it('lets admin delete any comment (204)', async () => {
    const owner = await makeUser();
    const admin = await makeUser();
    await User.updateOne({ _id: admin.id }, { $set: { isAdmin: true } });
    const gem = await createGem(owner.token);

    const c = await request(app)
      .post(`/api/gems/${gem.id}/comments`)
      .set(auth(owner.token))
      .send({ text: 'admin can remove' })
      .expect(201);

    await request(app)
      .delete(`/api/gems/${gem.id}/comments/${c.body.id}`)
      .set(auth(admin.token))
      .expect(204);
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
