import { Image, Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Gem } from '../services/api';
import { categoryEmoji, formatVotes } from '../utils/format';
import { colors, glass, radius, rf, spacing, text } from '../utils/theme';

interface Props {
  gem: Gem;
  highlight?: boolean;
}

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
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            padding: highlight ? spacing.lg : spacing.md,
            borderRadius: radius.lg,
            marginBottom: spacing.md,
            backgroundColor: highlight ? 'rgba(30,41,59,0.65)' : glass.fill,
            borderWidth: 1,
            borderColor: highlight ? 'rgba(255,255,255,0.12)' : glass.border,
            ...(highlight && { borderLeftWidth: 2, borderLeftColor: 'rgba(255,255,255,0.3)' }),
          }}
        >
          {/* Thumbnail */}
          <View>
            {gem.photoUrl ? (
              <Image source={{ uri: gem.photoUrl }} style={highlight ? thumbHighlight : thumb} />
            ) : (
              <View
                style={[
                  highlight ? thumbHighlight : thumb,
                  {
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: CATEGORY_TINT[gem.category] ?? CATEGORY_TINT.other,
                  },
                ]}
              >
                <Text style={{ fontSize: highlight ? rf(40) : rf(36) }}>{categoryEmoji(gem.category)}</Text>
              </View>
            )}
            {highlight && (
              <View
                style={{
                  position: 'absolute',
                  top: 6,
                  left: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(0,0,0,0.55)',
                  borderRadius: radius.pill,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ fontSize: rf(10), color: '#FCD34D' }}>★</Text>
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.85)',
                    fontWeight: '600',
                    fontSize: rf(10),
                    marginLeft: 3,
                    letterSpacing: 0.4,
                  }}
                >
                  Top
                </Text>
              </View>
            )}
          </View>

          <View style={{ flex: 1, minWidth: 0, gap: highlight ? 8 : 6 }}>
            <Text
              style={[
                text.body,
                { fontWeight: '800', fontSize: highlight ? rf(17) : rf(16) },
              ]}
              numberOfLines={1}
            >
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

            {/* Meta */}
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
              backgroundColor: highlight ? 'rgba(245,158,11,0.08)' : glass.fillStrong,
              borderWidth: 1,
              borderColor: highlight ? 'rgba(245,158,11,0.2)' : glass.border,
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

const thumbHighlight = {
  width: rf(120),
  height: rf(120),
  borderRadius: radius.md,
  backgroundColor: colors.surfaceAlt,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.08)',
  flexShrink: 0,
} as const;