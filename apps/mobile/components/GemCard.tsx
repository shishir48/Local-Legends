import { Image, Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import type { Gem } from '../services/api';
import { categoryEmoji, formatVotes } from '../utils/format';
import { colors, radius, spacing, text } from '../utils/theme';

export function GemCard({ gem }: { gem: Gem }) {
  return (
    <Link href={`/gems/${gem.id}`} asChild>
      <Pressable
        style={({ pressed }) => ({
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          marginBottom: spacing.md,
          overflow: 'hidden',
          opacity: pressed ? 0.8 : 1,
        })}
      >
        {gem.photoUrl ? (
          <Image
            source={{ uri: gem.photoUrl }}
            style={{ width: '100%', height: 160, backgroundColor: colors.surfaceAlt }}
          />
        ) : (
          <View
            style={{
              height: 160,
              backgroundColor: colors.surfaceAlt,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 48 }}>{categoryEmoji(gem.category)}</Text>
          </View>
        )}

        <View style={{ padding: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
            <Text style={{ fontSize: 18, marginRight: spacing.xs }}>
              {categoryEmoji(gem.category)}
            </Text>
            <Text style={[text.h2, { flex: 1 }]} numberOfLines={1}>
              {gem.name}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surfaceAlt,
                paddingHorizontal: spacing.sm,
                paddingVertical: 4,
                borderRadius: radius.pill,
              }}
            >
              <Text style={{ fontSize: 14, marginRight: 4 }}>▲</Text>
              <Text style={[text.body, { fontWeight: '700' }]}>{formatVotes(gem.voteCount)}</Text>
            </View>
          </View>
          <Text style={text.muted} numberOfLines={2}>
            {gem.description}
          </Text>
          <Text style={[text.muted, { marginTop: spacing.xs, fontSize: 12 }]} numberOfLines={1}>
            {gem.address}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}
