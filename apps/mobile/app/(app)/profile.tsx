import { ActivityIndicator, FlatList, Pressable, Text, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useUserGems } from '../../hooks/useGems';
import { GemCard } from '../../components/GemCard';
import { GemCardSkeleton } from '../../components/GemCardSkeleton';
import { AmbientGlow } from '../../components/AmbientGlow';
import { categoryEmoji, formatVotes } from '../../utils/format';
import { colors, glass, radius, spacing, text, CONTENT_MAX_WIDTH } from '../../utils/theme';

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

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const submissions = useUserGems(user?.id);

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const totalUpvotes = submissions.data?.totalUpvotes ?? 0;
  const items = submissions.data?.items ?? [];

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
          <Text style={text.muted}>{user.email}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
        <StatCard value={items.length} label="Gems" />
        <StatCard value={formatVotes(totalUpvotes)} label="Upvotes" />
      </View>

      <Text style={[text.h2, { marginBottom: spacing.md }]}>Your gems</Text>
    </View>
  );

  const footer = (
    <View>
      <Pressable
        onPress={logout}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        style={({ pressed }) => ({
          marginTop: spacing.xl,
          padding: spacing.md,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.danger,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.danger} style={{ marginRight: spacing.xs }} />
        <Text style={{ color: colors.danger, fontWeight: '600' }}>Sign out</Text>
      </Pressable>
      <Text style={[text.muted, { textAlign: 'center', marginTop: spacing.lg, fontSize: 11 }]}>
        v{Constants.expoConfig?.version ?? '—'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <AmbientGlow />
      <FlatList
        data={items}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => <GemCard gem={item} />}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={
          submissions.isLoading ? (
            <View>
              <GemCardSkeleton />
              <GemCardSkeleton />
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
              <Text style={{ fontSize: 48, marginBottom: spacing.sm }}>{categoryEmoji('other')}</Text>
              <Text style={text.body}>You haven't submitted a gem yet.</Text>
              <Text style={[text.muted, { marginTop: spacing.xs }]}>Tap + below to add one.</Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
