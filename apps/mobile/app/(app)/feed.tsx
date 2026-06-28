import { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFeedGems } from '../../hooks/useGems';
import { useAuthStore } from '../../stores/authStore';
import { GemCard } from '../../components/GemCard';
import { AmbientGlow } from '../../components/AmbientGlow';
import { colors, glass, radius, spacing, text } from '../../utils/theme';

function EmptyFeed() {
  const user = useAuthStore((s) => s.user);
  return (
    <View style={{ alignItems: 'center', padding: spacing.xxl, paddingTop: spacing.xl * 2 }}>
      <Ionicons name="people-outline" size={64} color={colors.textMuted} style={{ marginBottom: spacing.lg }} />
      <Text style={text.h2}>Your feed is empty</Text>
      <Text style={[text.muted, { marginTop: spacing.sm, textAlign: 'center', lineHeight: 22, paddingHorizontal: spacing.lg }]}>
        {user
          ? 'Follow other users to see their gem submissions here. Tap a user\'s name on any gem to follow them.'
          : 'Sign in and follow other users to see their latest gems here.'
        }
      </Text>
    </View>
  );
}

export default function FeedScreen() {
  const feed = useFeedGems();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const items = feed.data?.items ?? [];

  const renderItem = useCallback(
    ({ item }: { item: (typeof items)[number] }) => <GemCard gem={item} />,
    []
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <AmbientGlow />
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm }}>
        <Text style={text.h1}>Feed</Text>
        <Text style={[text.muted, { marginTop: spacing.xs }]}>
          {user ? 'Latest gems from people you follow' : 'Sign in to follow people and see their gems'}
        </Text>
      </View>

      {feed.isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(g) => g.id}
          renderItem={renderItem}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews
          ListEmptyComponent={<EmptyFeed />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          refreshControl={
            <RefreshControl
              refreshing={feed.isFetching && !feed.isLoading}
              onRefresh={feed.refetch}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
