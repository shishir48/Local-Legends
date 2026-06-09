import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserGems, useFollow } from '../../../hooks/useGems';
import { useAuthStore } from '../../../stores/authStore';
import { GemCard } from '../../../components/GemCard';
import { GemCardSkeleton } from '../../../components/GemCardSkeleton';
import { AmbientGlow } from '../../../components/AmbientGlow';
import { categoryEmoji, formatVotes } from '../../../utils/format';
import { colors, glass, radius, spacing, text, CONTENT_MAX_WIDTH } from '../../../utils/theme';

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: glass.fill,
        borderWidth: 1,
        borderColor: glass.border,
        padding: spacing.md,
        borderRadius: radius.lg,
        alignItems: 'center',
      }}
    >
      <Text style={[text.h2, { color: colors.primary }]}>{value}</Text>
      <Text style={text.muted}>{label}</Text>
    </View>
  );
}

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useUserGems(id);
  const currentUser = useAuthStore((s) => s.user);
  const follow = useFollow(id!);

  if (profile.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <AmbientGlow />
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (profile.isError || !profile.data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        <Stack.Screen options={{ title: 'Profile' }} />
        <Text style={text.h2}>Couldn't load that profile</Text>
        <Text style={text.muted}>This person may no longer exist.</Text>
      </View>
    );
  }

  const { user, items, totalUpvotes, isFollowing } = profile.data;
  const isOwnProfile = !!currentUser && currentUser.id === id;

  const header = (
    <View style={{ paddingVertical: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
        {user.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={{ width: 64, height: 64, borderRadius: 32, marginRight: spacing.md }} />
        ) : (
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              marginRight: spacing.md,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="person" size={30} color={colors.textMuted} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={text.h2}>{user.displayName}</Text>
          {!isOwnProfile && currentUser ? (
            <Pressable
              onPress={() => follow.mutate()}
              disabled={follow.isPending}
              style={({ pressed }) => ({
                marginTop: spacing.xs,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: isFollowing ? glass.border : colors.primary,
                backgroundColor: isFollowing ? glass.fill : colors.primary,
                alignSelf: 'flex-start',
                opacity: pressed || follow.isPending ? 0.6 : 1,
              })}
            >
              <Text style={{
                fontSize: 13,
                fontWeight: '600',
                color: isFollowing ? colors.textMuted : colors.bg,
              }}>
                {follow.isPending ? '…' : isFollowing ? 'Following' : 'Follow'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
        <StatCard value={items.length} label="Gems" />
        <StatCard value={formatVotes(totalUpvotes)} label="Upvotes received" />
        {user.followersCount !== undefined ? (
          <StatCard value={user.followersCount} label="Followers" />
        ) : null}
      </View>

      <Text style={[text.h2, { marginBottom: spacing.md }]}>
        {user.displayName.split(' ')[0]}'s gems
      </Text>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <AmbientGlow />
      <Stack.Screen options={{ title: user.displayName }} />
      <FlatList
        data={items}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => <GemCard gem={item} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <Text style={{ fontSize: 48, marginBottom: spacing.sm }}>{categoryEmoji('other')}</Text>
            <Text style={text.body}>No gems yet.</Text>
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
