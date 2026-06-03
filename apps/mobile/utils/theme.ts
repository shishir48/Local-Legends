import { Dimensions } from 'react-native';

// --- Responsive scaling ------------------------------------------------
// App is locked to portrait, so reading width once at load is stable.
// Type + key dimensions scale between small (~320) and large (~430+) phones.
const BASE_WIDTH = 390; // iPhone 14/15 logical width as the design baseline
const SCREEN_WIDTH = Dimensions.get('window').width;
const FACTOR = Math.min(1.15, Math.max(0.85, SCREEN_WIDTH / BASE_WIDTH));

/** Responsive font/size: scales `n` by the phone's width factor. */
export function rf(n: number): number {
  return Math.round(n * FACTOR);
}

export { SCREEN_WIDTH };
/** Cap content width so cards don't stretch absurdly on large/foldable screens. */
export const CONTENT_MAX_WIDTH = 560;

export const colors = {
  bg: '#0B1120',          // deeper navy so the neon wash reads
  surface: '#1E293B',
  surfaceAlt: '#334155',
  border: '#475569',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  primary: '#F59E0B',
  primarySoft: '#FCD34D',
  accent: '#EC4899',      // pink, used only for the ambient neon wash
  danger: '#EF4444',
  success: '#10B981',
};

// Faux-glass surfaces — translucent fills + hairline highlight borders.
// Pure RN colors (no expo-blur), so everything ships over EAS Update.
export const glass = {
  fill: 'rgba(30,41,59,0.55)',
  border: 'rgba(255,255,255,0.08)',
  fillStrong: 'rgba(15,23,42,0.60)',
  amberFill: 'rgba(245,158,11,0.10)',
  amberBorder: 'rgba(245,158,11,0.34)',
} as const;

// Colored glow. iOS honours shadowColor; Android elevation falls back to a
// neutral shadow but the amber border keeps the effect legible.
export const glow = {
  amber: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
};

// Spacing scales with screen width too, so paddings/gaps stay proportional
// across small and large phones (not just font sizes).
export const spacing = {
  xs: rf(4),
  sm: rf(8),
  md: rf(12),
  lg: rf(16),
  xl: rf(24),
  xxl: rf(32),
};

export const text = {
  h1: { fontSize: rf(28), fontWeight: '700' as const, color: colors.text },
  h2: { fontSize: rf(20), fontWeight: '700' as const, color: colors.text },
  body: { fontSize: rf(15), color: colors.text },
  muted: { fontSize: rf(13), color: colors.textMuted },
  cta: { fontSize: rf(16), fontWeight: '600' as const, color: colors.bg },
};

// Card elevation. iOS reads shadow*, Android reads elevation — set both.
export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

// Dark scrim drawn under text laid over photos so titles stay legible.
export const overlay = 'rgba(15,23,42,0.85)'; // colors.bg @ 85%
