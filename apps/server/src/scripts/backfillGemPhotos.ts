/**
 * One-off: backfill `photoUrl` for gems that have none, using a Google Places
 * text search (name + city) → first photo → Cloudinary.
 *
 * Run on the droplet after deploy:
 *   node dist/scripts/backfillGemPhotos.js
 *
 * Safe to re-run: only touches gems where photoUrl is empty.
 */
import mongoose from 'mongoose';
import { config } from '../lib/config';
import { Gem } from '../models/Gem';
import { googlePhotoUri } from '../lib/googlePhotos';
import { saveFromUrl } from '../lib/imageStore';

const SEARCH_TEXT = 'https://places.googleapis.com/v1/places:searchText';

function googleKey(): string | undefined {
  return process.env.GOOGLE_MAPS_API_KEY?.trim() || undefined;
}

async function firstPhotoName(query: string, key: string): Promise<string | undefined> {
  const resp = await fetch(SEARCH_TEXT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.photos',
    },
    body: JSON.stringify({ textQuery: query, includedRegionCodes: ['in'] }),
  });
  if (!resp.ok) return undefined;
  const data = (await resp.json()) as { places?: Array<{ photos?: Array<{ name: string }> }> };
  return data.places?.[0]?.photos?.[0]?.name;
}

async function main() {
  const key = googleKey();
  if (!key) {
    console.error('GOOGLE_MAPS_API_KEY not set — aborting.');
    process.exit(1);
  }

  await mongoose.connect(config.MONGO_URI);
  const gems = await Gem.find({
    isDeleted: false,
    $or: [{ photoUrl: null }, { photoUrl: '' }, { photoUrl: { $exists: false } }],
  });
  console.log(`Found ${gems.length} gems without a photo.`);

  for (const gem of gems) {
    const query = `${gem.name}, ${gem.city}`;
    try {
      const photoName = await firstPhotoName(query, key);
      if (!photoName) {
        console.log(`  ✗ no photo found for "${query}"`);
        continue;
      }
      const uri = await googlePhotoUri(photoName);
      if (!uri) {
        console.log(`  ✗ could not resolve photo uri for "${query}"`);
        continue;
      }
      const asset = await saveFromUrl(uri);
      if (!asset) {
        console.log(`  ✗ image save failed for "${query}"`);
        continue;
      }
      gem.photoUrl = asset.url;
      gem.photoPublicId = asset.publicId;
      await gem.save();
      console.log(`  ✓ ${gem.name} → ${asset.url}`);
    } catch (err) {
      console.log(`  ✗ error for "${query}":`, (err as Error).message);
    }
  }

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
