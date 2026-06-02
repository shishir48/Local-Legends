import { describe, it, expect, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { User } from '../src/models/User';
import { Gem } from '../src/models/Gem';
import * as gemService from '../src/services/gemService';

async function seedUser() {
  const u = await User.create({
    email: `u${Math.random()}@test.dev`,
    passwordHash: 'x',
    displayName: 'U',
  });
  return u._id as Types.ObjectId;
}

async function seedGem(submittedBy: Types.ObjectId, overrides: Record<string, unknown> = {}) {
  return gemService.createGem({
    name: 'G',
    category: 'food',
    description: 'desc',
    address: 'addr',
    city: 'Chennai',
    lat: 13.08,
    lng: 80.27,
    submittedBy,
    ...overrides,
  } as Parameters<typeof gemService.createGem>[0]);
}

describe('gemService.toggleVote', () => {
  it('adds then removes a vote, keeping voteCount in sync with votedBy', async () => {
    const owner = await seedUser();
    const voter = await seedUser();
    const gem = await seedGem(owner);

    const on = await gemService.toggleVote(gem.id, voter.toString());
    expect(on).toEqual({ voted: true, voteCount: 1 });

    const off = await gemService.toggleVote(gem.id, voter.toString());
    expect(off).toEqual({ voted: false, voteCount: 0 });
  });

  it('never lets voteCount drift from votedBy under concurrent votes (regression)', async () => {
    const owner = await seedUser();
    const voter = await seedUser();
    const gem = await seedGem(owner);

    // Two simultaneous first-votes from the SAME user. The bug double-incremented
    // voteCount while $addToSet kept votedBy at one entry.
    await Promise.all([
      gemService.toggleVote(gem.id, voter.toString()),
      gemService.toggleVote(gem.id, voter.toString()),
    ]);

    const fresh = await Gem.findById(gem.id).select('voteCount votedBy').lean();
    expect(fresh!.votedBy).toHaveLength(1);
    expect(fresh!.voteCount).toBe(1); // must equal votedBy length, not 2
  });

  it('throws 404 for an unknown gem', async () => {
    const voter = await seedUser();
    await expect(
      gemService.toggleVote(new Types.ObjectId().toString(), voter.toString())
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe('gemService.updateGem', () => {
  let ownerId: Types.ObjectId;

  beforeEach(async () => {
    ownerId = await seedUser();
  });

  it('applies city and mapsUrl edits (regression — they were silently dropped)', async () => {
    const gem = await seedGem(ownerId, { city: 'Chennai', mapsUrl: 'https://maps.example/a' });

    const updated = await gemService.updateGem(gem.id, ownerId.toString(), {
      city: 'Mumbai',
      mapsUrl: 'https://maps.example/b',
    });

    expect(updated.city).toBe('Mumbai');
    expect(updated.mapsUrl).toBe('https://maps.example/b');
  });

  it('updates location when both lat and lng are supplied', async () => {
    const gem = await seedGem(ownerId);
    const updated = await gemService.updateGem(gem.id, ownerId.toString(), {
      lat: 19.07,
      lng: 72.87,
    });
    expect(updated.location.coordinates).toEqual([72.87, 19.07]); // [lng, lat]
  });

  it('forbids editing a gem you do not own', async () => {
    const gem = await seedGem(ownerId);
    const stranger = await seedUser();
    await expect(
      gemService.updateGem(gem.id, stranger.toString(), { name: 'Hacked' })
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe('gemService.listGems', () => {
  it('filters by category, sorts by votes desc, and paginates', async () => {
    const owner = await seedUser();
    await seedGem(owner, { name: 'A', category: 'food' });
    const b = await seedGem(owner, { name: 'B', category: 'food' });
    await seedGem(owner, { name: 'C', category: 'bar' });
    await Gem.findByIdAndUpdate(b.id, { voteCount: 5 });

    const res = await gemService.listGems({ category: 'food', sort: 'votes', page: 1, limit: 10 });
    expect(res.total).toBe(2);
    expect(res.items[0].name).toBe('B'); // highest votes first
  });

  it('excludes soft-deleted gems', async () => {
    const owner = await seedUser();
    const g = await seedGem(owner);
    await gemService.deleteGem(g.id, owner.toString());
    const res = await gemService.listGems({ sort: 'recent', page: 1, limit: 10 });
    expect(res.total).toBe(0);
  });

  it('matches city case-insensitively', async () => {
    const owner = await seedUser();
    await seedGem(owner, { city: 'Chennai' });
    const res = await gemService.listGems({ city: 'chennai', sort: 'recent', page: 1, limit: 10 });
    expect(res.total).toBe(1);
  });
});

describe('gemService.getGemById', () => {
  it('reports hasVoted=true only for a viewer who voted', async () => {
    const owner = await seedUser();
    const voter = await seedUser();
    const gem = await seedGem(owner);
    await gemService.toggleVote(gem.id, voter.toString());

    const asVoter = await gemService.getGemById(gem.id, voter.toString());
    expect(asVoter.hasVoted).toBe(true);

    const asAnon = await gemService.getGemById(gem.id);
    expect(asAnon.hasVoted).toBe(false);
  });
});

describe('gemService.findNearby', () => {
  it('returns gems within the radius and skips far ones', async () => {
    const owner = await seedUser();
    await seedGem(owner, { name: 'Near', lat: 13.08, lng: 80.27 });
    await seedGem(owner, { name: 'Far', lat: 28.61, lng: 77.21 }); // Delhi, ~1700km

    const items = await gemService.findNearby({ lat: 13.08, lng: 80.27, radiusKm: 5, limit: 20 });
    expect(items.map((g) => g.name)).toEqual(['Near']);
  });
});
