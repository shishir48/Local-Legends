import { Image, Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Gem } from '../services/api';
import { categoryEmoji, formatVotes } from '../utils/format';
import { colors, glass, glow, radius, rf, spacing, text } from '../utils/theme';

interface Props {
  gem: Gem;
  /** When true the card gets amber glass + glow + a "top gem" badge (top of feed). */
  highlight?: boolean;
}

// Soft per-category tint behind the emoji when a gem has no photo.
const CATEGORY_TINT: Record<string, string> = {
  food: 'rgba(245,158,11,0.16)',
  nature: 'rgba(16,185,129,0.16)',
  shop: 'rgba(236,72,153,0.16)',
  bar: 'rgba(139,92,246,0.16)',
  art: 'rgba(59,130,246,0.16)',
  other: 'rgba(148,163,184,0.16)',
};

function cap(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** Submitter display name, when the gem's submittedBy is populated. */
function submitterName(submittedBy: Gem['submittedBy']): string {
  return typeof submittedBy === 'object' && submittedBy ? submittedBy.displayName : '';
}

export function GemCard({ gem, highlight = false }: Props) {
  const area = gem.city?.trim() || '';
  const addedBy = submitterName(gem.submittedBy);

  return (
    <Link href={`/gems/${gem.id}`} asChild>
      <Pressable accessibilityRole="button" accessibilityLabel={`${gem.name}, ${gem.voteCount} votes`}>
        <View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              padding: spacing.md,
              borderRadius: radius.lg,
              marginBottom: spacing.md,
              backgroundColor: glass.fill,
              borderWidth: highlight ? 1.5 : 1,
              borderColor: highlight ? colors.primary : glass.border,
            },
            highlight && glow.amber,
          ]}
        >
          {/* Thumbnail — large, photo-forward; tinted category tile as fallback */}
          {gem.photoUrl ? (
            <Image
              source={{ uri: gem.photoUrl }}
              style={[thumb, highlight && { borderColor: colors.primary }]}
            />
          ) : (
            <View
              style={[
                thumb,
                highlight && { borderColor: colors.primary },
                {
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: CATEGORY_TINT[gem.category] ?? CATEGORY_TINT.other,
                },
              ]}
            >
              <Text style={{ fontSize: rf(36) }}>{categoryEmoji(gem.category)}</Text>
            </View>
          )}

          <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
            {/* Top-gem badge */}
            {highlight && (
              <View style={{ flexDirection: 'row' }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.primary,
                    borderRadius: radius.pill,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ fontSize: rf(11) }}>🔥</Text>
                  <Text style={{ color: colors.bg, fontWeight: '800', fontSize: rf(11), marginLeft: 4, letterSpacing: 0.3 }}>
                    TOP GEM
                  </Text>
                </View>
              </View>
            )}

            <Text style={[text.body, { fontWeight: '800', fontSize: rf(16) }]} numberOfLines={1}>
              {gem.name}
            </Text>

            {/* Category chip */}
            <View style={{ flexDirection: 'row' }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: glass.fillStrong,
                  borderWidth: 1,
                  borderColor: glass.border,
                  borderRadius: radius.pill,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 3,
                }}
              >
                <Text style={{ fontSize: rf(12) }}>{categoryEmoji(gem.category)}</Text>
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: rf(12), marginLeft: 4 }}>
                  {cap(gem.category)}
                </Text>
              </View>
            </View>

            {/* Meta: location · added by — one tidy muted line */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="location-outline" size={rf(12)} color={colors.textMuted} />
              <Text style={[text.muted, { marginLeft: 3, fontSize: rf(12), flexShrink: 1 }]} numberOfLines={1}>
                {area || 'Unknown'}
                {addedBy ? ` · by ${addedBy}` : ''}
              </Text>
            </View>
          </View>

          {/* Vote pill */}
          <View
            style={{
              minWidth: rf(54),
              alignItems: 'center',
              alignSelf: 'stretch',
              justifyContent: 'center',
              backgroundColor: highlight ? glass.amberFill : glass.fillStrong,
              borderWidth: 1,
              borderColor: highlight ? glass.amberBorder : glass.border,
              borderRadius: radius.md,
              paddingHorizontal: spacing.xs,
            }}
          >
            <Ionicons name="arrow-up" size={rf(15)} color={colors.primary} />
            <Text style={{ color: colors.primarySoft, fontWeight: '800', fontSize: rf(16), marginTop: 1 }}>
              {formatVotes(gem.voteCount)}
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const thumb = {
  width: rf(92),
  height: rf(92),
  borderRadius: radius.md,
  backgroundColor: colors.surfaceAlt,
  borderWidth: 1,
  borderColor: glass.border,
  flexShrink: 0,
} as const;
