import { useWindowDimensions } from 'react-native';
import { Image, Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Gem } from '../services/api';
import { categoryEmoji, formatVotes } from '../utils/format';
import { colors, glass, glow, radius, rf, spacing, text } from '../utils/theme';

interface Props {
  gem: Gem;
  highlight?: boolean;
}

const CATEGORY_COLORS: Record<string, { bg: string; gradient: string }> = {
  food:   { bg: '#F59E0B', gradient: '#B45309' },
  nature: { bg: '#10B981', gradient: '#065F46' },
  shop:   { bg: '#EC4899', gradient: '#9D174D' },
  bar:    { bg: '#8B5CF6', gradient: '#5B21B6' },
  art:    { bg: '#3B82F6', gradient: '#1E40AF' },
  other:  { bg: '#64748B', gradient: '#334155' },
};

function cap(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function submitterName(submittedBy: Gem['submittedBy']): string {
  return typeof submittedBy === 'object' && submittedBy ? submittedBy.displayName : '';
}

function submitterAvatar(submittedBy: Gem['submittedBy']): string | null {
  return typeof submittedBy === 'object' && submittedBy ? submittedBy.avatarUrl : null;
}

// ────────────────────────────────────────────────────────────────────────────
// Highlight / Top Gem — Hero Card
// ────────────────────────────────────────────────────────────────────────────
function TopGemCard({ gem }: { gem: Gem }) {
  const { width } = useWindowDimensions();
  const cardWidth = width - spacing.lg * 2;
  const cardHeight = Math.round(cardWidth * 0.72); // ~5:7 aspect ratio for hero
  const area = gem.city?.trim() || '';
  const addedBy = submitterName(gem.submittedBy);
  const avatar = submitterAvatar(gem.submittedBy);
  const catColor = CATEGORY_COLORS[gem.category] ?? CATEGORY_COLORS.other;

  return (
    <Link href={`/gems/${gem.id}`} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${gem.name}, ${gem.voteCount} votes. Top gem.`}
        style={({ pressed }) => ({
          marginBottom: spacing.lg,
          transform: [{ scale: pressed ? 0.97 : 1 }],
          opacity: pressed ? 0.94 : 1,
        })}
      >
        {gem.photoUrl ? (
          /* ── Photo Hero ── */
          <View
            style={{
              width: '100%',
              height: cardHeight,
              borderRadius: radius.lg,
              overflow: 'hidden',
              backgroundColor: colors.surface,
              ...glow.amber,
            }}
          >
            <Image
              source={{ uri: gem.photoUrl }}
              style={{ width: '100%', height: '100%', position: 'absolute' }}
              resizeMode="cover"
            />

            {/* Dark gradient overlay — fades from bottom up, darker at top for title */}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '100%',
                backgroundColor: 'rgba(0,0,0,0.20)',
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '65%',
                backgroundColor: 'transparent',
              }}
            >
              {/* Bottom-up gradient using layered translucent views */}
              <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                <View style={{ height: '60%', backgroundColor: 'rgba(11,17,32,0.70)' }} />
                <View style={{ height: '40%', backgroundColor: 'rgba(11,17,32,0.40)' }} />
              </View>
            </View>

            {/* Top glass border accent — amber glow line */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                backgroundColor: colors.primary,
                opacity: 0.6,
              }}
            />

            {/* 🏆 Top Badge — floating top-left */}
            <View
              style={{
                position: 'absolute',
                top: spacing.md,
                left: spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(245,158,11,0.18)',
                borderRadius: radius.pill,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderWidth: 1,
                borderColor: 'rgba(245,158,11,0.45)',
                ...glow.amber,
              }}
            >
              <Text style={{ fontSize: rf(12) }}>🏆</Text>
              <Text
                style={{
                  color: '#FCD34D',
                  fontWeight: '800',
                  fontSize: rf(10),
                  marginLeft: 5,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                }}
              >
                Top Gem
              </Text>
            </View>

            {/* Content — bottom-aligned over the image */}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: spacing.lg,
              }}
            >
              {/* Name */}
              <Text
                style={{
                  color: '#FFFFFF',
                  fontWeight: '800',
                  fontSize: rf(24),
                  letterSpacing: -0.3,
                  lineHeight: rf(30),
                  textShadowColor: 'rgba(0,0,0,0.5)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 4,
                }}
                numberOfLines={2}
              >
                {gem.name}
              </Text>

              {/* Glass metadata bar */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: spacing.sm,
                  backgroundColor: 'rgba(15,23,42,0.65)',
                  borderRadius: radius.pill,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 6,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.06)',
                  alignSelf: 'flex-start',
                  gap: spacing.sm,
                }}
              >
                {/* Category pill */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.10)',
                    borderRadius: radius.pill,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ fontSize: rf(11) }}>{categoryEmoji(gem.category)}</Text>
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.85)',
                      fontWeight: '600',
                      fontSize: rf(10),
                      marginLeft: 4,
                    }}
                  >
                    {cap(gem.category)}
                  </Text>
                </View>

                {/* Location */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons name="location-outline" size={rf(10)} color="rgba(255,255,255,0.50)" />
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.60)',
                      fontSize: rf(10),
                      fontWeight: '500',
                    }}
                    numberOfLines={1}
                  >
                    {area || 'Unknown'}
                  </Text>
                </View>

                {/* Divider */}
                <View
                  style={{
                    width: 1,
                    height: 10,
                    backgroundColor: 'rgba(255,255,255,0.12)',
                  }}
                />

                {/* Vote count */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Ionicons name="arrow-up" size={rf(10)} color={colors.primary} />
                  <Text
                    style={{
                      color: colors.primarySoft,
                      fontWeight: '800',
                      fontSize: rf(11),
                    }}
                  >
                    {formatVotes(gem.voteCount)}
                  </Text>
                </View>

                {/* Comment count */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Ionicons name="chatbubble-ellipses" size={rf(9)} color="rgba(255,255,255,0.45)" />
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.60)',
                      fontWeight: '600',
                      fontSize: rf(10),
                    }}
                  >
                    {formatVotes(gem.commentCount)}
                  </Text>
                </View>
              </View>

              {/* Submitter row */}
              {addedBy ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: spacing.sm,
                  }}
                >
                  {avatar ? (
                    <Image
                      source={{ uri: avatar }}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        marginRight: 5,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.15)',
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        marginRight: 5,
                        backgroundColor: 'rgba(255,255,255,0.12)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="person" size={10} color="rgba(255,255,255,0.50)" />
                    </View>
                  )}
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.50)',
                      fontSize: rf(10),
                      fontWeight: '500',
                    }}
                  >
                    by{' '}
                    <Text style={{ color: 'rgba(255,255,255,0.75)', fontWeight: '600' }}>
                      {addedBy}
                    </Text>
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : (
          /* ── No Photo Hero — gradient emoji card ── */
          <View
            style={{
              width: '100%',
              height: cardHeight,
              borderRadius: radius.lg,
              overflow: 'hidden',
              ...glow.amber,
            }}
          >
            {/* Gradient background built from layered views */}
            <View style={{ flex: 1, backgroundColor: catColor.gradient }}>
              {/* Main color zone */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: catColor.bg,
                  opacity: 0.75,
                }}
              />
            </View>

            {/* Large emoji — centered but offset up */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: rf(72), opacity: 0.35 }}>{categoryEmoji(gem.category)}</Text>
            </View>

            {/* Bottom gradient overlay for text */}
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%' }}>
              <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                <View style={{ height: '50%', backgroundColor: 'rgba(11,17,32,0.75)' }} />
                <View style={{ height: '50%', backgroundColor: 'rgba(11,17,32,0.40)' }} />
              </View>
            </View>

            {/* Top glass border accent */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                backgroundColor: 'rgba(255,255,255,0.15)',
              }}
            />

            {/* 🏆 Top Badge */}
            <View
              style={{
                position: 'absolute',
                top: spacing.md,
                left: spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(245,158,11,0.18)',
                borderRadius: radius.pill,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderWidth: 1,
                borderColor: 'rgba(245,158,11,0.45)',
                ...glow.amber,
              }}
            >
              <Text style={{ fontSize: rf(12) }}>🏆</Text>
              <Text
                style={{
                  color: '#FCD34D',
                  fontWeight: '800',
                  fontSize: rf(10),
                  marginLeft: 5,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                }}
              >
                Top Gem
              </Text>
            </View>

            {/* Content — bottom-aligned */}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: spacing.lg,
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontWeight: '800',
                  fontSize: rf(24),
                  letterSpacing: -0.3,
                  lineHeight: rf(30),
                  textShadowColor: 'rgba(0,0,0,0.5)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 4,
                }}
                numberOfLines={2}
              >
                {gem.name}
              </Text>

              {/* Glass metadata bar */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: spacing.sm,
                  backgroundColor: 'rgba(15,23,42,0.65)',
                  borderRadius: radius.pill,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 6,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.06)',
                  alignSelf: 'flex-start',
                  gap: spacing.sm,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.10)',
                    borderRadius: radius.pill,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ fontSize: rf(11) }}>{categoryEmoji(gem.category)}</Text>
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.85)',
                      fontWeight: '600',
                      fontSize: rf(10),
                      marginLeft: 4,
                    }}
                  >
                    {cap(gem.category)}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons name="location-outline" size={rf(10)} color="rgba(255,255,255,0.50)" />
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.60)',
                      fontSize: rf(10),
                      fontWeight: '500',
                    }}
                    numberOfLines={1}
                  >
                    {area || 'Unknown'}
                  </Text>
                </View>

                <View style={{ width: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.12)' }} />

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Ionicons name="arrow-up" size={rf(10)} color={colors.primary} />
                  <Text
                    style={{
                      color: colors.primarySoft,
                      fontWeight: '800',
                      fontSize: rf(11),
                    }}
                  >
                    {formatVotes(gem.voteCount)}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Ionicons name="chatbubble-ellipses" size={rf(9)} color="rgba(255,255,255,0.45)" />
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.60)',
                      fontWeight: '600',
                      fontSize: rf(10),
                    }}
                  >
                    {formatVotes(gem.commentCount)}
                  </Text>
                </View>
              </View>

              {addedBy ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm }}>
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      marginRight: 5,
                      backgroundColor: 'rgba(255,255,255,0.12)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="person" size={10} color="rgba(255,255,255,0.50)" />
                  </View>
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.50)',
                      fontSize: rf(10),
                      fontWeight: '500',
                    }}
                  >
                    by{' '}
                    <Text style={{ color: 'rgba(255,255,255,0.75)', fontWeight: '600' }}>
                      {addedBy}
                    </Text>
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        )}
      </Pressable>
    </Link>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Regular Gem Card
// ────────────────────────────────────────────────────────────────────────────
function RegularGemCard({ gem }: { gem: Gem }) {
  const area = gem.city?.trim() || '';
  const addedBy = submitterName(gem.submittedBy);

  return (
    <Link href={`/gems/${gem.id}`} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${gem.name}, ${gem.voteCount} votes`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.md,
          borderRadius: radius.lg,
          marginBottom: spacing.md,
          backgroundColor: glass.fill,
          borderWidth: 1,
          borderColor: glass.border,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
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
                backgroundColor: 'rgba(255,255,255,0.05)',
              },
            ]}
          >
            <Text style={{ fontSize: rf(36) }}>{categoryEmoji(gem.category)}</Text>
          </View>
        )}

        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <Text
            style={{
              color: colors.text,
              fontWeight: '800',
              fontSize: rf(16),
              letterSpacing: -0.2,
            }}
            numberOfLines={1}
          >
            {gem.name}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: radius.pill,
                paddingHorizontal: 7,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontSize: rf(10) }}>{categoryEmoji(gem.category)}</Text>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontWeight: '600',
                  fontSize: rf(10),
                  marginLeft: 3,
                }}
              >
                {cap(gem.category)}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Ionicons name="location-outline" size={rf(10)} color={colors.textMuted} />
            <Text
              style={{
                color: colors.textMuted,
                fontSize: rf(11),
                flexShrink: 1,
              }}
              numberOfLines={1}
            >
              {area || 'Unknown'}
              {addedBy ? ` · by ${addedBy}` : ''}
            </Text>
          </View>
        </View>

        <View
          style={{
            minWidth: rf(48),
            alignItems: 'center',
            alignSelf: 'stretch',
            justifyContent: 'center',
            gap: 2,
            backgroundColor: 'rgba(245,158,11,0.06)',
            borderWidth: 1,
            borderColor: 'rgba(245,158,11,0.15)',
            borderRadius: radius.md,
            paddingHorizontal: spacing.xs,
          }}
        >
          <Ionicons name="arrow-up" size={rf(13)} color={colors.primary} />
          <Text
            style={{
              color: colors.primarySoft,
              fontWeight: '800',
              fontSize: rf(14),
            }}
          >
            {formatVotes(gem.voteCount)}
          </Text>
          {gem.commentCount !== undefined ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
              <Ionicons name="chatbubble-outline" size={rf(7)} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontSize: rf(9), fontWeight: '600' }}>
                {formatVotes(gem.commentCount)}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Exported component
// ────────────────────────────────────────────────────────────────────────────
export function GemCard({ gem, highlight = false }: Props) {
  if (highlight) {
    return <TopGemCard gem={gem} />;
  }
  return <RegularGemCard gem={gem} />;
}

const thumb = {
  width: rf(80),
  height: rf(80),
  borderRadius: radius.md,
  backgroundColor: colors.surfaceAlt,
  borderWidth: 1,
  borderColor: glass.border,
  flexShrink: 0,
} as const;
