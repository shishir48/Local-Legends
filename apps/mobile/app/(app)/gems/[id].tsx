import { ActivityIndicator, Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGem } from '../../../hooks/useGems';
import { VoteButton } from '../../../components/VoteButton';
import { AmbientGlow } from '../../../components/AmbientGlow';
import { categoryEmoji, formatTimeAgo } from '../../../utils/format';
import { colors, glass, radius, spacing, text } from '../../../utils/theme';

export default function GemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const gem = useGem(id);

  if (gem.isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (gem.isError || !gem.data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: spacing.xl }}>
        <Text style={text.h2}>Couldn't find that gem</Text>
        <Text style={text.muted}>It may have been removed.</Text>
      </View>
    );
  }

  const g = gem.data;
  const submitter = typeof g.submittedBy === 'object' ? g.submittedBy : null;
  const [lng, lat] = g.location.coordinates;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AmbientGlow />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
      <Stack.Screen options={{ title: g.name }} />

      {g.photoUrl ? (
        <Image source={{ uri: g.photoUrl }} style={{ width: '100%', height: 280, backgroundColor: colors.surfaceAlt }} />
      ) : (
        <View style={{ width: '100%', height: 280, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 80 }}>{categoryEmoji(g.category)}</Text>
        </View>
      )}

      <View style={{ padding: spacing.lg }}>
        <Text style={text.h1}>{g.name}</Text>
        <Text style={[text.muted, { marginTop: spacing.xs }]}>
          {categoryEmoji(g.category)} {g.category} · {formatTimeAgo(g.createdAt)}
        </Text>

        <Text style={[text.body, { marginTop: spacing.lg, lineHeight: 22 }]}>{g.description}</Text>

        <View style={{ marginTop: spacing.lg, padding: spacing.md, backgroundColor: glass.fill, borderWidth: 1, borderColor: glass.border, borderRadius: radius.lg }}>
          <Text style={text.muted}>Address</Text>
          <Text style={[text.body, { marginTop: spacing.xs }]}>{g.address}</Text>
        </View>

        <Pressable
          onPress={() => {
            const url = g.mapsUrl
              ?? `https://www.google.com/maps/place/${encodeURIComponent(g.name)}/@${lat},${lng},17z`;
            Linking.openURL(url);
          }}
          style={({ pressed }) => ({
            marginTop: spacing.lg,
            padding: spacing.md,
            backgroundColor: pressed ? glass.fillStrong : glass.fill,
            borderWidth: 1,
            borderColor: glass.amberBorder,
            borderRadius: radius.lg,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
          })}
        >
          <Ionicons name="map-outline" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
          <Text style={[text.body, { color: colors.primary, fontWeight: '600' }]}>Open in Google Maps</Text>
        </Pressable>

        {submitter ? (
          <Pressable
            onPress={() => router.push(`/users/${submitter._id}`)}
            style={{ marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center' }}
            accessibilityRole="button"
            accessibilityLabel={`View ${submitter.displayName}'s profile`}
          >
            {submitter.avatarUrl ? (
              <Image
                source={{ uri: submitter.avatarUrl }}
                style={{ width: 24, height: 24, borderRadius: 12, marginRight: spacing.sm }}
              />
            ) : (
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  marginRight: spacing.sm,
                  backgroundColor: colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="person" size={14} color={colors.textMuted} />
              </View>
            )}
            <Text style={text.muted}>
              Submitted by <Text style={{ color: colors.primary, fontWeight: '600' }}>{submitter.displayName}</Text>
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ marginLeft: spacing.xs }} />
          </Pressable>
        ) : null}

        <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
          <VoteButton gemId={g.id} voteCount={g.voteCount} hasVoted={!!g.hasVoted} />
        </View>
      </View>
      </ScrollView>
    </View>
  );
}
