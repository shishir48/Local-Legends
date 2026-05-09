import bcrypt from 'bcryptjs';
import { connectDB } from './lib/db';
import { User } from './models/User';
import { Gem, GEM_CATEGORIES } from './models/Gem';
import mongoose from 'mongoose';

const SAMPLE_USERS = [
  { email: 'maya@example.com',  displayName: 'Maya',  password: 'password123' },
  { email: 'arjun@example.com', displayName: 'Arjun', password: 'password123' },
  { email: 'priya@example.com', displayName: 'Priya', password: 'password123' },
];

const SAMPLE_GEMS: Array<{
  name: string;
  category: (typeof GEM_CATEGORIES)[number];
  description: string;
  address: string;
  lat: number;
  lng: number;
}> = [
  // Bengaluru hidden gems — replace with your own city's spots before demo
  { name: 'Cafe Down the Lane',     category: 'food',   description: 'Tucked behind a bookstore. Best filter coffee in Indiranagar.', address: 'Indiranagar 100ft Rd, Bengaluru', lat: 12.9719, lng: 77.6412 },
  { name: 'Cubbon Reading Bench',   category: 'nature', description: 'Quiet bench under a 100-year-old rain tree. Bring a book.',   address: 'Cubbon Park, Bengaluru',          lat: 12.9763, lng: 77.5929 },
  { name: 'Vinyl & Co.',            category: 'shop',   description: 'Tiny vinyl shop run by a retired drummer. Crate-dig heaven.',   address: 'Church Street, Bengaluru',        lat: 12.9739, lng: 77.6062 },
  { name: 'The Permit Room',        category: 'bar',    description: 'Speakeasy behind an unmarked black door. Try the rasam mary.',  address: 'Koramangala 5th Block, Bengaluru', lat: 12.9352, lng: 77.6245 },
  { name: 'Studio 21 Gallery',      category: 'art',    description: 'Rotating exhibitions by local artists. Free Sundays.',           address: 'MG Road, Bengaluru',              lat: 12.9756, lng: 77.6101 },
  { name: 'Lalbagh Glasshouse Pond', category: 'nature', description: 'Hidden pond beside the glasshouse. Kingfishers at dawn.',       address: 'Lalbagh Botanical Garden',        lat: 12.9507, lng: 77.5848 },
  { name: 'CTR Dosa Stall',         category: 'food',   description: 'Tiny stall, the original benne dosa. Cash only.',                address: 'Malleshwaram, Bengaluru',         lat: 13.0036, lng: 77.5689 },
  { name: 'Bookworm',               category: 'shop',   description: 'Second-hand bookstore stacked floor to ceiling.',                address: 'Church Street, Bengaluru',        lat: 12.9745, lng: 77.6068 },
  { name: 'Toit Brewpub Backpatio', category: 'bar',    description: 'Quiet outdoor patio behind the main bar. Locals only.',          address: 'Indiranagar, Bengaluru',          lat: 12.9789, lng: 77.6408 },
  { name: 'Sankey Tank Walk',       category: 'nature', description: 'Loop walk around the lake. Best at sunrise.',                    address: 'Sankey Tank, Bengaluru',          lat: 13.0067, lng: 77.5722 },
  { name: 'The Hole in the Wall',   category: 'food',   description: 'No menu, no signboard. Whatever the cook makes that day.',       address: 'Shivajinagar, Bengaluru',         lat: 12.9852, lng: 77.6049 },
  { name: 'Blossom Book House Loft', category: 'shop',  description: 'Skip the ground floor — the loft is where the rare ones live.', address: 'Church Street, Bengaluru',        lat: 12.9742, lng: 77.6064 },
];

async function main() {
  await connectDB();

  console.log('[seed] clearing existing users and gems');
  await User.deleteMany({});
  await Gem.deleteMany({});

  console.log('[seed] inserting users');
  const users = await Promise.all(
    SAMPLE_USERS.map(async (u) => {
      const passwordHash = await bcrypt.hash(u.password, 12);
      return User.create({
        email: u.email,
        displayName: u.displayName,
        passwordHash,
      });
    })
  );

  console.log('[seed] inserting gems');
  for (let i = 0; i < SAMPLE_GEMS.length; i++) {
    const g = SAMPLE_GEMS[i];
    if (!g) continue;
    const submitter = users[i % users.length]!;
    const voters = users.filter((_, idx) => idx !== i % users.length).slice(0, (i % 3) + 1);
    await Gem.create({
      name: g.name,
      category: g.category,
      description: g.description,
      address: g.address,
      location: { type: 'Point', coordinates: [g.lng, g.lat] },
      submittedBy: submitter._id,
      votedBy: voters.map((v) => v._id),
      voteCount: voters.length,
    });
  }

  console.log(`[seed] done — ${users.length} users, ${SAMPLE_GEMS.length} gems`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
