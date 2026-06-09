import { Image, Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Gem } from '../services/api';
import { categoryEmoji, formatVotes } from '../utils/format';
import { colors, glass, radius, rf, shadow, spacing, text } from '../utils/theme';

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

const CATEGORY_TINT_STRONG: Record<string, string> = {
  food: 'rgba(245,158,11,0.35)',
  nature: 'rgba(16,185,129,0.35)',
  shop: 'rgba(236,72,153,0.35)',
  bar: 'rgba(139,92,246,0.35)',
  art: 'rgba(59,130,246,0.35)',
  other: 'rgba(148,163,184,0.35)',
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

  if (highlight) {
    return (
      <Link href={`/gems/${gem.id}`} asChild>
        <Pressable accessibilityRole="button" accessibilityLabel={`${gem.name}, ${gem.voteCount} votes`}>
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            marginBottom: spacing.md,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.06)',
            ...shadow.card,
            overflow: 'hidden',
          }}>
            {/* Gold top accent */}
            <View style={{ height: 2, backgroundColor: colors.primary, width: '40%' }} />

            <View style={{
              flexDirection: 'row',
              gap: spacing.lg,
              padding: spacing.lg,
            }}>
              {/* Thumbnail */}
              <View>
                {gem.photoUrl ? (
                  <View>
                    <Image source={{ uri: gem.photoUrl }} style={thumbHighlight} />
                    <View style={{
                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                      borderRadius: radius.md,
                      backgroundColor: 'rgba(0,0,0,0.15)',
                    }} />
                  </View>
                ) : (
                  <View style={[thumbHighlight, {
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: CATEGORY_TINT_STRONG[gem.category] ?? CATEGORY_TINT_STRONG.other,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.06)',
                  }]}>
                    <Text style={{ fontSize: rf(36) }}>{categoryEmoji(gem.category)}</Text>
                  </View>
                )}
                {/* ★ Top badge */}
                <View style={{
                  position: 'absolute',
                  top: -4,
                  left: -4,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(15,23,42,0.85)',
                  borderRadius: radius.pill,
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                  borderWidth: 1,
                  borderColor: 'rgba(245,158,11,0.4)',
                }}>
                  <Text style={{ fontSize: rf(9), color: '#FCD34D' }}>★</Text>
                  <Text style={{
                    color: 'rgba(255,255,255,0.9)',
                    fontWeight: '700',
                    fontSize: rf(9),
                    marginLeft: 3,
                    letterSpacing: 0.6,
                  }}>TOP</Text>
                </View>
              </View>

              {/* Content */}
              <View style={{ flex: 1, minWidth: 0, justifyContent: 'space-between' }}>
                <Text style={{
                  color: colors.text,
                  fontWeight: '700',
                  fontSize: rf(17),
                  letterSpacing: 0.2,
                }} numberOfLines={1}>
                  {gem.name}
                </Text>

                {/* Category + location row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderRadius: radius.pill,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}>
                    <Text style={{ fontSize: rf(11) }}>{categoryEmoji(gem.category)}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '600', fontSize: rf(11), marginLeft: 4 }}>
                      {cap(gem.category)}
                    </Text>
                  </View>
                  <Ionicons name="location-outline" size={rf(11)} color="rgba(255,255,255,0.35)" />
                  <Text style={{
                    color: 'rgba(255,255,255,0.45)',
                    fontSize: rf(11),
                    flexShrink: 1,
                  }} numberOfLines={1}>
                    {area || 'Unknown'}{addedBy ? ` · ${addedBy}` : ''}
                  </Text>
                </View>

                {/* Vote row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
                  <View style={{
                    backgroundColor: 'rgba(245,158,11,0.12)',
                    borderRadius: radius.sm,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    <Ionicons name="arrow-up" size={rf(13)} color={colors.primary} />
                    <Text style={{
                      color: colors.primarySoft,
                      fontWeight: '700',
                      fontSize: rf(14),
                      letterSpacing: 0.2,
                    }}>
                      {formatVotes(gem.voteCount)}
                    </Text>
                  </View>
                  <Text style={{
                    color: 'rgba(255,255,255,0.25)',
                    fontSize: rf(10),
                    letterSpacing: 0.3,
                    textTransform: 'uppercase',
                  }}>
                    upvotes
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: spacing.sm }}>
                    <Ionicons name="chatbubble-outline" size={rf(12)} color="rgba(255,255,255,0.45)" />
                    <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: rf(12), fontWeight: '600' }}>
                      {formatVotes(gem.commentCount)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Pressable>
      </Link>
    );
  }

  return (
    <Link href={`/gems/${gem.id}`} asChild>
      <Pressable accessibilityRole="button" accessibilityLabel={`${gem.name}, ${gem.voteCount} votes`}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            padding: spacing.md,
            borderRadius: radius.lg,
            marginBottom: spacing.md,
            backgroundColor: glass.fill,
            borderWidth: 1,
            borderColor: glass.border,
          }}
        >
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
              <Text style={{ fontSize: rf(36) }}>{categoryEmoji(gem.category)}</Text>
            </View>
          )}

          <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
            <Text style={[text.body, { fontWeight: '800', fontSize: rf(16) }]} numberOfLines={1}>
              {gem.name}
            </Text>

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

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="location-outline" size={rf(12)} color={colors.textMuted} />
              <Text style={[text.muted, { marginLeft: 3, fontSize: rf(12), flexShrink: 1 }]} numberOfLines={1}>
                {area || 'Unknown'}
                {addedBy ? ` · by ${addedBy}` : ''}
              </Text>
            </View>
          </View>

          <View
            style={{
              minWidth: rf(54),
              alignItems: 'center',
              alignSelf: 'stretch',
              justifyContent: 'center',
              backgroundColor: glass.fillStrong,
              borderWidth: 1,
              borderColor: glass.border,
              borderRadius: radius.md,
              paddingHorizontal: spacing.xs,
            }}
          >
            <Ionicons name="arrow-up" size={rf(15)} color={colors.primary} />
            <Text style={{ color: colors.primarySoft, fontWeight: '800', fontSize: rf(16), marginTop: 1 }}>
              {formatVotes(gem.voteCount)}
            </Text>
            {gem.commentCount !== undefined ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 }}>
                <Ionicons name="chatbubble-outline" size={rf(9)} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: rf(10), fontWeight: '600' }}>
                  {formatVotes(gem.commentCount)}
                </Text>
              </View>
            ) : null}
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
  width: rf(110),
  height: rf(110),
  borderRadius: radius.md,
  backgroundColor: colors.surfaceAlt,
  flexShrink: 0,
} as const;