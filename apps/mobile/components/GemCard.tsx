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

export function GemCard({ gem, highlight = false }: Props) {
  const area = gem.city?.trim() || '';

  // All visual + layout styles live on this inner View. expo-router's
  // <Link asChild> can drop a function `style` on the cloned Pressable, so
  // the Pressable handles only the tap and the View guarantees the row.
  return (
    <Link href={`/gems/${gem.id}`} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${gem.name}, ${gem.voteCount} votes`}
      >
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
          {/* Thumbnail: photo if present, else a tinted category tile */}
          {gem.photoUrl ? (
            <Image source={{ uri: gem.photoUrl }} style={thumb} />
          ) : (
            <View style={[thumb, { alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ fontSize: rf(26) }}>{categoryEmoji(gem.category)}</Text>
            </View>
          )}

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[text.body, { fontWeight: '700', fontSize: rf(15) }]} numberOfLines={1}>
              {gem.name}
            </Text>
            <Text style={[text.muted, { marginTop: 3 }]} numberOfLines={1}>
              {categoryEmoji(gem.category)} {gem.category}
              {area ? ` · ${area}` : ''}
            </Text>
            {highlight && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <Text style={{ fontSize: 11 }}>🔥</Text>
                <Text style={[text.muted, { marginLeft: 4, color: colors.primarySoft, fontWeight: '700', fontSize: 11 }]}>
                  Top gem here
                </Text>
              </View>
            )}
          </View>

          {/* Vote pill */}
          <View
            style={{
              minWidth: rf(50),
              alignItems: 'center',
              backgroundColor: glass.fillStrong,
              borderWidth: 1,
              borderColor: glass.border,
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
  width: rf(60),
  height: rf(60),
  borderRadius: radius.md,
  backgroundColor: colors.surfaceAlt,
  flexShrink: 0,
} as const;
