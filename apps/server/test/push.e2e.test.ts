import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, auth, makeUser, gemPayload } from './helpers';
import { PushToken } from '../src/models/PushToken';
import { Gem } from '../src/models/Gem';
import { highestMilestoneReached } from '../src/services/gemService';
import { sendToUser, pushEnabled } from '../src/lib/push';

async function createGem(token: string, overrides: Record<string, unknown> = {}) {
  const res = await request(app).post('/api/gems').set(auth(token)).send(gemPayload(overrides)).expect(201);
  return res.body;
}

describe('push token registration', () => {
  it('POST /api/push/register upserts a token (no dupes on re-register)', async () => {
    const u = await makeUser();
    await request(app)
      .post('/api/push/register')
      .set(auth(u.token))
      .send({ token: 'tok-abc', platform: 'android' })
      .expect(204);
    // re-register same token → still one row, bound to the user
    await request(app)
      .post('/api/push/register')
      .set(auth(u.token))
      .send({ token: 'tok-abc', platform: 'android' })
      .expect(204);

    const rows = await PushToken.find({ token: 'tok-abc' });
    expect(rows).toHaveLength(1);
    expect(rows[0].user.toString()).toBe(u.id);
  });

  it('rebinds a token to the latest user', async () => {
    const a = await makeUser();
    const b = await makeUser();
    await request(app).post('/api/push/register').set(auth(a.token)).send({ token: 'shared', platform: 'android' }).expect(204);
    await request(app).post('/api/push/register').set(auth(b.token)).send({ token: 'shared', platform: 'android' }).expect(204);

    const rows = await PushToken.find({ token: 'shared' });
    expect(rows).toHaveLength(1);
    expect(rows[0].user.toString()).toBe(b.id);
  });

  it('DELETE /api/push/register removes the token', async () => {
    const u = await makeUser();
    await request(app).post('/api/push/register').set(auth(u.token)).send({ token: 'tok-del', platform: 'android' }).expect(204);
    await request(app).delete('/api/push/register').set(auth(u.token)).send({ token: 'tok-del' }).expect(204);
    expect(await PushToken.findOne({ token: 'tok-del' })).toBeNull();
  });

  it('requires auth', async () => {
    await request(app).post('/api/push/register').send({ token: 't', platform: 'android' }).expect(401);
    await request(app).delete('/api/push/register').send({ token: 't' }).expect(401);
  });

  it('rejects a bad platform (400)', async () => {
    const u = await makeUser();
    await request(app).post('/api/push/register').set(auth(u.token)).send({ token: 't', platform: 'ios' }).expect(400);
  });
});

describe('highestMilestoneReached', () => {
  it('returns the highest crossed milestone above what was notified', () => {
    expect(highestMilestoneReached(0, 0)).toBeNull();
    expect(highestMilestoneReached(1, 0)).toBe(1);
    expect(highestMilestoneReached(9, 1)).toBeNull(); // 9 < next milestone (10)
    expect(highestMilestoneReached(10, 1)).toBe(10);
    expect(highestMilestoneReached(60, 10)).toBe(50);
    expect(highestMilestoneReached(10, 10)).toBeNull(); // already notified at 10
    expect(highestMilestoneReached(25, 25)).toBeNull();
  });
});

describe('vote milestone side effect', () => {
  it('claims the milestone when a stranger casts the first upvote', async () => {
    const owner = await makeUser();
    const voter = await makeUser();
    const gem = await createGem(owner.token);

    await request(app).post(`/api/gems/${gem.id}/vote`).set(auth(voter.token)).expect(200);

    const after = await Gem.findById(gem.id).select('voteCount notifiedVoteMilestone');
    expect(after?.voteCount).toBe(1);
    expect(after?.notifiedVoteMilestone).toBe(1);
  });

  it('does not notify on a self-vote', async () => {
    const owner = await makeUser();
    const gem = await createGem(owner.token);

    await request(app).post(`/api/gems/${gem.id}/vote`).set(auth(owner.token)).expect(200);

    const after = await Gem.findById(gem.id).select('voteCount notifiedVoteMilestone');
    expect(after?.voteCount).toBe(1);
    expect(after?.notifiedVoteMilestone).toBe(0); // self-vote never claims a milestone
  });

  it('does not re-claim a milestone when a vote toggles across it again', async () => {
    const owner = await makeUser();
    const voter = await makeUser();
    const gem = await createGem(owner.token);

    await request(app).post(`/api/gems/${gem.id}/vote`).set(auth(voter.token)).expect(200); // up → 1
    await request(app).post(`/api/gems/${gem.id}/vote`).set(auth(voter.token)).expect(200); // down → 0
    await request(app).post(`/api/gems/${gem.id}/vote`).set(auth(voter.token)).expect(200); // up → 1 again

    const after = await Gem.findById(gem.id).select('voteCount notifiedVoteMilestone');
    expect(after?.voteCount).toBe(1);
    expect(after?.notifiedVoteMilestone).toBe(1); // stayed at 1, not re-fired
  });
});

describe('push lib when unconfigured', () => {
  it('is disabled and sendToUser is a no-op (no throw)', async () => {
    expect(pushEnabled()).toBe(false);
    await expect(sendToUser('000000000000000000000000', { title: 't', body: 'b' })).resolves.toBeUndefined();
  });
});
