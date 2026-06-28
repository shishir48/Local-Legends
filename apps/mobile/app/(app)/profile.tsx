import { ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl, Text, TextInput, View, Image, type DimensionValue } from 'react-native';
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
import { usersApi } from '../../services/api';
import { useState } from 'react';
import { useRouter } from 'expo-router';

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

function SkeletonBlock({ width, height }: { width: DimensionValue; height: number }) {
  return <View style={{ width, height, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)' }} />;
}

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setUser = useAuthStore((s) => s.setUser);
  const submissions = useUserGems(user?.id);
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [saving, setSaving] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followerList, setFollowerList] = useState<{ _id: string; displayName: string; avatarUrl: string | null }[]>([]);
  const [followingList, setFollowingList] = useState<{ _id: string; displayName: string; avatarUrl: string | null }[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const totalUpvotes = submissions.data?.totalUpvotes ?? 0;
  const items = submissions.data?.items ?? [];
  const isRefreshing = submissions.isFetching && !submissions.isLoading;

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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={text.h2}>{user.displayName}</Text>
            <Pressable
              onPress={() => {
                setEditName(user.displayName);
                setEditAvatar(user.avatarUrl ?? '');
                setEditOpen(true);
              }}
              hitSlop={8}
              style={{ marginLeft: spacing.sm, padding: 2 }}
            >
              <Ionicons name="pencil" size={16} color={colors.textMuted} />
            </Pressable>
          </View>
          <Text style={text.muted}>{user.email}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
        <StatCard value={items.length} label="Gems" />
        <StatCard value={formatVotes(totalUpvotes)} label="Upvotes" />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
        <Pressable
          style={({ pressed }) => ({
            flex: 1,
            opacity: pressed ? 0.75 : 1,
          })}
          onPress={async () => {
            setLoadingList(true);
            setShowFollowers(true);
            try {
              const res = await usersApi.followers(user.id);
              setFollowerList(res.items);
            } catch { setFollowerList([]); }
            setLoadingList(false);
          }}
        >
          <View
            style={{
              backgroundColor: glass.fill,
              borderWidth: 1,
              borderColor: glass.border,
              padding: spacing.md,
              borderRadius: radius.lg,
              alignItems: 'center',
            }}
          >
            <Text style={[text.h2, { color: colors.primary }]}>{submissions.data?.user.followersCount ?? 0}</Text>
            <Text style={text.muted}>Followers</Text>
          </View>
        </Pressable>
        <Pressable
          style={({ pressed }) => ({
            flex: 1,
            opacity: pressed ? 0.75 : 1,
          })}
          onPress={async () => {
            setLoadingList(true);
            setShowFollowing(true);
            try {
              const res = await usersApi.following(user.id);
              setFollowingList(res.items);
            } catch { setFollowingList([]); }
            setLoadingList(false);
          }}
        >
          <View
            style={{
              backgroundColor: glass.fill,
              borderWidth: 1,
              borderColor: glass.border,
              padding: spacing.md,
              borderRadius: radius.lg,
              alignItems: 'center',
            }}
          >
            <Text style={[text.h2, { color: colors.primary }]}>{submissions.data?.user.followingCount ?? 0}</Text>
            <Text style={text.muted}>Following</Text>
          </View>
        </Pressable>
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
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        updateCellsBatchingPeriod={50}
        windowSize={5}
        removeClippedSubviews
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={
          submissions.isLoading ? (
            <View style={{ paddingTop: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    marginRight: spacing.md,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  }}
                />
                <View style={{ flex: 1, gap: spacing.sm }}>
                  <SkeletonBlock width="54%" height={18} />
                  <SkeletonBlock width="40%" height={13} />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.lg, padding: spacing.md, minHeight: 74 }} />
                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.lg, padding: spacing.md, minHeight: 74 }} />
              </View>
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
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={submissions.refetch}
            tintColor={colors.primary}
          />
        }
      />

      {/* Edit profile modal */}
      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.lg }} onPress={() => setEditOpen(false)}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg }}>
            <Text style={[text.h2, { marginBottom: spacing.lg }]}>Edit profile</Text>

            <Text style={[text.muted, { marginBottom: spacing.xs }]}>Display name</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              placeholderTextColor={colors.textMuted}
              maxLength={50}
              style={{
                backgroundColor: glass.fill,
                color: colors.text,
                borderWidth: 1,
                borderColor: glass.border,
                borderRadius: radius.md,
                padding: spacing.md,
                fontSize: 16,
                marginBottom: spacing.md,
              }}
            />

            <Text style={[text.muted, { marginBottom: spacing.xs }]}>Avatar URL</Text>
            <TextInput
              value={editAvatar}
              onChangeText={setEditAvatar}
              placeholder="https://example.com/avatar.jpg"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              style={{
                backgroundColor: glass.fill,
                color: colors.text,
                borderWidth: 1,
                borderColor: glass.border,
                borderRadius: radius.md,
                padding: spacing.md,
                fontSize: 16,
                marginBottom: spacing.lg,
              }}
            />

            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Pressable
                onPress={() => setEditOpen(false)}
                style={({ pressed }) => ({
                  flex: 1,
                  padding: spacing.md,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: glass.border,
                  alignItems: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  if (!editName.trim()) return;
                  setSaving(true);
                  try {
                    const updated = await usersApi.updateMe({
                      displayName: editName.trim(),
                      avatarUrl: editAvatar.trim() || null,
                    });
                    await setUser(updated);
                    setEditOpen(false);
                  } catch {
                    Alert.alert('Update failed', 'Could not save profile. Try again.');
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving || !editName.trim()}
                style={({ pressed }) => ({
                  flex: 1,
                  padding: spacing.md,
                  borderRadius: radius.md,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  opacity: pressed || saving || !editName.trim() ? 0.6 : 1,
                })}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.bg} />
                ) : (
                  <Text style={{ color: colors.bg, fontWeight: '600' }}>Save</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Followers modal */}
      <Modal visible={showFollowers} transparent animationType="fade" onRequestClose={() => setShowFollowers(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }} onPress={() => setShowFollowers(false)}>
          <View style={{ flex: 1, marginTop: 100, backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg }}>
            <Text style={[text.h2, { marginBottom: spacing.md }]}>Followers</Text>
            {loadingList ? (
              <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.xl }} />
            ) : followerList.length === 0 ? (
              <Text style={[text.muted, { textAlign: 'center', paddingVertical: spacing.xl }]}>No followers yet.</Text>
            ) : (
              <FlatList
                data={followerList}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => { setShowFollowers(false); router.push(`/users/${item._id}`); }}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm }}
                  >
                    {item.avatarUrl ? (
                      <Image source={{ uri: item.avatarUrl }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: spacing.sm }} />
                    ) : (
                      <View style={{ width: 36, height: 36, borderRadius: 18, marginRight: spacing.sm, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="person" size={18} color={colors.textMuted} />
                      </View>
                    )}
                    <Text style={[text.body, { fontWeight: '600' }]}>{item.displayName}</Text>
                  </Pressable>
                )}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Following modal */}
      <Modal visible={showFollowing} transparent animationType="fade" onRequestClose={() => setShowFollowing(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }} onPress={() => setShowFollowing(false)}>
          <View style={{ flex: 1, marginTop: 100, backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg }}>
            <Text style={[text.h2, { marginBottom: spacing.md }]}>Following</Text>
            {loadingList ? (
              <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.xl }} />
            ) : followingList.length === 0 ? (
              <Text style={[text.muted, { textAlign: 'center', paddingVertical: spacing.xl }]}>Not following anyone yet.</Text>
            ) : (
              <FlatList
                data={followingList}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => { setShowFollowing(false); router.push(`/users/${item._id}`); }}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm }}
                  >
                    {item.avatarUrl ? (
                      <Image source={{ uri: item.avatarUrl }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: spacing.sm }} />
                    ) : (
                      <View style={{ width: 36, height: 36, borderRadius: 18, marginRight: spacing.sm, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="person" size={18} color={colors.textMuted} />
                      </View>
                    )}
                    <Text style={[text.body, { fontWeight: '600' }]}>{item.displayName}</Text>
                  </Pressable>
                )}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
