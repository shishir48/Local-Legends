export const colors = {
  bg: '#0F172A',
  surface: '#1E293B',
  surfaceAlt: '#334155',
  border: '#475569',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  primary: '#F59E0B',
  primarySoft: '#FCD34D',
  danger: '#EF4444',
  success: '#10B981',
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const text = {
  h1: { fontSize: 28, fontWeight: '700' as const, color: colors.text },
  h2: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 15, color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  cta: { fontSize: 16, fontWeight: '600' as const, color: colors.bg },
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
