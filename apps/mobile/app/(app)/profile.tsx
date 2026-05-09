import { ActivityIndicator, FlatList, Pressable, Text, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { useUserGems } from '../../hooks/useGems';
import { GemCard } from '../../components/GemCard';
import { categoryEmoji, formatVotes } from '../../utils/format';
import { colors, radius, spacing, text } from '../../utils/theme';

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

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => <GemCard gem={item} />}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
        ListHeaderComponent={
          <View style={{ paddingVertical: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
              {user.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={{ width: 64, height: 64, borderRadius: 32, marginRight: spacing.md }} />
              ) : (
                <View style={{ width: 64, height: 64, borderRadius: 32, marginRight: spacing.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 28 }}>👤</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={text.h2}>{user.displayName}</Text>
                <Text style={text.muted}>{user.email}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', marginBottom: spacing.lg }}>
              <View style={{ flex: 1, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, marginRight: spacing.sm, alignItems: 'center' }}>
                <Text style={[text.h2, { color: colors.primary }]}>{items.length}</Text>
                <Text style={text.muted}>Gems</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, marginLeft: spacing.sm, alignItems: 'center' }}>
                <Text style={[text.h2, { color: colors.primary }]}>{formatVotes(totalUpvotes)}</Text>
                <Text style={text.muted}>Upvotes</Text>
              </View>
            </View>

            <Text style={[text.h2, { marginBottom: spacing.md }]}>Your gems</Text>
          </View>
        }
        ListEmptyComponent={
          submissions.isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
              <Text style={{ fontSize: 48, marginBottom: spacing.sm }}>{categoryEmoji('other')}</Text>
              <Text style={text.body}>You haven't submitted a gem yet.</Text>
              <Text style={[text.muted, { marginTop: spacing.xs }]}>Tap + below to add one.</Text>
            </View>
          )
        }
        ListFooterComponent={
          <Pressable
            onPress={logout}
            style={({ pressed }) => ({
              marginTop: spacing.xl,
              padding: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.danger,
              alignItems: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ color: colors.danger, fontWeight: '600' }}>Sign out</Text>
          </Pressable>
        }
      />
    </SafeAreaView>
  );
}
