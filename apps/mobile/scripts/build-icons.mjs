// Regenerates app icons from a hand-authored SVG.
// Ultra-modern "Local Legend" mark: pin-in-ring brand motif restyled with a
// violet->amber gradient, soft glow, and depth (highlight + drop shadow) on a
// navy radial backdrop.
//
//   node scripts/build-icons.mjs
//
// Outputs:
//   assets/icon.png           1024x1024, full-bleed navy bg (iOS rounds corners)
//   assets/adaptive-icon.png  1024x1024, transparent, content in Android safe zone
//
// Requires `sharp` (npm install sharp). Icon changes are NATIVE — they only
// ship in a new build (eas build / store), never via EAS Update / OTA.

import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assets = resolve(__dirname, '..', 'assets');

const SIZE = 1024;
const C = SIZE / 2; // center 512

// Brand palette
const NAVY = '#0F172A';
const NAVY_LIFT = '#1E293B'; // radial glow center
const VIOLET = '#8B5CF6';
const AMBER = '#F59E0B';

// Material "place" pin path (24x24). bbox x:5..19 y:2..22 -> center (12,12).
const PIN_PATH =
  'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z' +
  'm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z';

const PIN_SCALE = 15; // 20 tall * 15 = 300px pin
const pinTx = C - 12 * PIN_SCALE; // center pin bbox (cx=12) on canvas
const pinTy = C - 12 * PIN_SCALE; // center pin bbox (cy=12) on canvas

const RING_R = 366; // outer-ish radius
const RING_W = 60; // stroke width

const defs = `
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="72%">
      <stop offset="0%" stop-color="${NAVY_LIFT}"/>
      <stop offset="60%" stop-color="${NAVY}"/>
      <stop offset="100%" stop-color="#0A0F1E"/>
    </radialGradient>
    <linearGradient id="brand" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${VIOLET}"/>
      <stop offset="55%" stop-color="#C2410C" stop-opacity="0"/>
      <stop offset="100%" stop-color="${AMBER}"/>
    </linearGradient>
    <linearGradient id="brandSolid" x1="15%" y1="0%" x2="85%" y2="100%">
      <stop offset="0%" stop-color="${VIOLET}"/>
      <stop offset="100%" stop-color="${AMBER}"/>
    </linearGradient>
    <radialGradient id="shine" cx="38%" cy="30%" r="55%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
      <stop offset="55%" stop-color="#ffffff" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="26" result="b"/>
      <feColorMatrix in="b" type="matrix"
        values="0 0 0 0 0.62  0 0 0 0 0.40  0 0 0 0 0.95  0 0 0 0.9 0"/>
    </filter>
    <filter id="pinGlow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="14" result="b"/>
      <feColorMatrix in="b" type="matrix"
        values="0 0 0 0 0.55  0 0 0 0 0.30  0 0 0 0 0.90  0 0 0 0.7 0"/>
    </filter>
  </defs>`;

// The brand mark (ring + pin), drawn around canvas center.
const mark = `
  <g>
    <circle cx="${C}" cy="${C}" r="${RING_R}" fill="none"
            stroke="url(#brandSolid)" stroke-width="${RING_W}" filter="url(#glow)" opacity="0.7"/>
    <circle cx="${C}" cy="${C}" r="${RING_R}" fill="none"
            stroke="url(#brandSolid)" stroke-width="${RING_W}" stroke-linecap="round"/>
    <g transform="translate(${pinTx} ${pinTy}) scale(${PIN_SCALE})" filter="url(#pinGlow)" opacity="0.8">
      <path d="${PIN_PATH}" fill="url(#brandSolid)" fill-rule="evenodd"/>
    </g>
    <g transform="translate(${pinTx} ${pinTy}) scale(${PIN_SCALE})">
      <path d="${PIN_PATH}" fill="url(#brandSolid)" fill-rule="evenodd"/>
      <path d="${PIN_PATH}" fill="url(#shine)" fill-rule="evenodd"/>
    </g>
  </g>`;

function svg({ withBackground }) {
  const bg = withBackground
    ? `<rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>`
    : '';
  // Android adaptive foreground must sit in the center safe zone (~66%).
  const inner = withBackground
    ? mark
    : `<g transform="translate(${C} ${C}) scale(0.66) translate(${-C} ${-C})">${mark}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${defs}${bg}${inner}</svg>`;
}

async function render(name, opts) {
  const out = resolve(assets, name);
  await sharp(Buffer.from(svg(opts))).png().toFile(out);
  console.log('wrote', out);
}

await render('icon.png', { withBackground: true });
await render('adaptive-icon.png', { withBackground: false });
console.log('done');
