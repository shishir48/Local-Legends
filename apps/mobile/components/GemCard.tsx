import { Image, Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Gem } from '../services/api';
import { categoryEmoji, formatVotes } from '../utils/format';
import { colors, overlay, radius, shadow, spacing, text } from '../utils/theme';

export function GemCard({ gem }: { gem: Gem }) {
  return (
    <Link href={`/gems/${gem.id}`} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${gem.name}, ${gem.voteCount} votes`}
        style={({ pressed }) => ({
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          marginBottom: spacing.md,
          overflow: 'hidden',
          transform: [{ scale: pressed ? 0.985 : 1 }],
          ...shadow.card,
        })}
      >
        <View>
          {gem.photoUrl ? (
            <Image
              source={{ uri: gem.photoUrl }}
              style={{ width: '100%', height: 180, backgroundColor: colors.surfaceAlt }}
            />
          ) : (
            <View
              style={{
                height: 180,
                backgroundColor: colors.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 52 }}>{categoryEmoji(gem.category)}</Text>
            </View>
          )}

          {/* Scrim keeps the title readable over any photo (solid View — no
              native gradient module, so this ships over-the-air) */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: overlay,
              justifyContent: 'flex-end',
              padding: spacing.md,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, marginRight: spacing.xs }}>{categoryEmoji(gem.category)}</Text>
              <Text style={[text.h2, { flex: 1, fontSize: 18 }]} numberOfLines={1}>
                {gem.name}
              </Text>
            </View>
          </View>

          {/* Vote chip floats top-right */}
          <View
            style={{
              position: 'absolute',
              top: spacing.sm,
              right: spacing.sm,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: overlay,
              paddingHorizontal: spacing.sm,
              paddingVertical: 4,
              borderRadius: radius.pill,
            }}
          >
            <Ionicons name="arrow-up" size={14} color={colors.primary} style={{ marginRight: 3 }} />
            <Text style={[text.body, { fontWeight: '700', fontSize: 13 }]}>{formatVotes(gem.voteCount)}</Text>
          </View>
        </View>

        <View style={{ padding: spacing.lg, paddingTop: spacing.md }}>
          <Text style={text.muted} numberOfLines={2}>
            {gem.description}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm }}>
            <Ionicons name="location-outline" size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
            <Text style={[text.muted, { fontSize: 12, flex: 1 }]} numberOfLines={1}>
              {gem.address}
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
