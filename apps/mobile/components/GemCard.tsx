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

export function GemCard({ gem, highlight = false }: Props) {
  const area = gem.city?.trim() || '';

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
              backgroundColor: highlight ? glass.amberFill : glass.fill,
              borderWidth: 1,
              borderColor: highlight ? glass.amberBorder : glass.border,
            },
            highlight && glow.amber,
          ]}
        >
          {/* Thumbnail — larger, photo-forward; tinted category tile as fallback */}
          {gem.photoUrl ? (
            <Image source={{ uri: gem.photoUrl }} style={thumb} />
          ) : (
            <View
              style={[
                thumb,
                {
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: CATEGORY_TINT[gem.category] ?? CATEGORY_TINT.other,
                },
              ]}
            >
              <Text style={{ fontSize: rf(34) }}>{categoryEmoji(gem.category)}</Text>
            </View>
          )}

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[text.body, { fontWeight: '800', fontSize: rf(16) }]} numberOfLines={1}>
              {gem.name}
            </Text>

            {/* Category chip */}
            <View style={{ flexDirection: 'row', marginTop: 6 }}>
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
                <Text style={{ color: colors.textMuted, fontWeight: '600', fontSize: rf(12), marginLeft: 4 }}>
                  {cap(gem.category)}
                </Text>
              </View>
            </View>

            {/* Location */}
            {area ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
                <Ionicons name="location-outline" size={rf(12)} color={colors.textMuted} />
                <Text style={[text.muted, { marginLeft: 3 }]} numberOfLines={1}>
                  {area}
                </Text>
              </View>
            ) : null}

            {highlight && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <Text style={{ fontSize: 11 }}>🔥</Text>
                <Text style={{ marginLeft: 4, color: colors.primarySoft, fontWeight: '700', fontSize: 11 }}>
                  Top gem here
                </Text>
              </View>
            )}
          </View>

          {/* Vote pill */}
          <View
            style={{
              minWidth: rf(52),
              alignItems: 'center',
              backgroundColor: highlight ? glass.amberFill : glass.fillStrong,
              borderWidth: 1,
              borderColor: highlight ? glass.amberBorder : glass.border,
              borderRadius: radius.md,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.xs,
            }}
          >
            <Ionicons name="arrow-up" size={rf(14)} color={colors.primary} />
            <Text style={{ color: colors.primarySoft, fontWeight: '800', fontSize: rf(15), marginTop: 1 }}>
              {formatVotes(gem.voteCount)}
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const thumb = {
  width: rf(84),
  height: rf(84),
  borderRadius: radius.md,
  backgroundColor: colors.surfaceAlt,
  borderWidth: 1,
  borderColor: glass.border,
  flexShrink: 0,
} as const;
