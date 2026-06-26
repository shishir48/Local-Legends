import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Keyboard, Linking, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useGem, useComments, useCreateComment, useDeleteComment } from '../../../hooks/useGems';
import { gemsApi, type Comment } from '../../../services/api';
import { useAuthStore } from '../../../stores/authStore';
import { VoteButton } from '../../../components/VoteButton';
import { AmbientGlow } from '../../../components/AmbientGlow';
import { categoryEmoji, formatTimeAgo } from '../../../utils/format';
import { colors, glass, radius, spacing, text } from '../../../utils/theme';

const GEM_CATEGORIES = ['food', 'nature', 'shop', 'bar', 'art', 'other'] as const;

type CommentRowItem = {
  id: string;
  comment: Comment;
  depth: 0 | 1;
  isReply: boolean;
};

export default function GemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const gem = useGem(id);
  const comments = useComments(id);
  const createComment = useCreateComment(id!);
  const deleteComment = useDeleteComment(id!);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCat, setEditCat] = useState<typeof GEM_CATEGORIES[number]>('food');
  const [editAddr, setEditAddr] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editMapsUrl, setEditMapsUrl] = useState('');
  const [editing, setEditing] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([gem.refetch(), comments.refetch()]);
    setRefreshing(false);
  };

  // Build comment tree — must be before any early return to keep hook count stable
  const commentList = comments.data?.items ?? [];
  const topLevel = useMemo(
    () =>
      commentList
        .filter((c) => !c.parentCommentId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [commentList]
  );
  const repliesByParent = useMemo(() => {
    const map = new Map<string, Comment[]>();
    for (const c of commentList) {
      if (c.parentCommentId) {
        const arr = map.get(c.parentCommentId) ?? [];
        arr.push(c);
        map.set(c.parentCommentId, arr);
      }
    }
    return map;
  }, [commentList]);
  const commentRows = useMemo<CommentRowItem[]>(() => {
    const rows: CommentRowItem[] = [];
    for (const c of topLevel) {
      rows.push({ id: c.id, comment: c, depth: 0, isReply: false });
      const replies = repliesByParent.get(c.id) ?? [];
      for (const r of replies) {
        rows.push({ id: r.id, comment: r, depth: 1, isReply: true });
      }
    }
    return rows;
  }, [topLevel, repliesByParent]);
  const canDelete = (c: Comment) => !!user && (user.isAdmin || user.id === c.user._id);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const sendComment = async () => {
    if (!newComment.trim()) return;
    try {
      await createComment.mutateAsync({ text: newComment.trim(), parentCommentId: null });
      setNewComment('');
    } catch {
      Alert.alert('Could not post comment', 'Try again.');
    }
  };

  const sendReply = async (parentCommentId: string) => {
    if (!replyText.trim()) return;
    try {
      await createComment.mutateAsync({ text: replyText.trim(), parentCommentId });
      setReplyText('');
      setReplyingTo(null);
    } catch {
      Alert.alert('Could not post reply', 'Try again.');
    }
  };

  const startReply = (parentCommentId: string) => {
    setReplyText('');
    setReplyingTo(parentCommentId);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyText('');
  };

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

  const submitterId = submitter?._id ?? (typeof g.submittedBy === 'string' ? g.submittedBy : null);
  const canDeleteGem = !!user && (user.isAdmin || submitterId === user.id);

  const confirmDelete = () => {
    Alert.alert('Delete gem', `Remove "${g.name}"? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await gemsApi.remove(g.id);
            queryClient.invalidateQueries({ queryKey: ['gems'] });
            queryClient.invalidateQueries({ queryKey: ['user-gems'] });
            router.back();
          } catch {
            setDeleting(false);
            Alert.alert('Delete failed', 'Could not delete that gem. Try again.');
          }
        },
      },
    ]);
  };

  const renderGemContent = () => (
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

      {canDeleteGem ? (
        <View style={{ marginTop: spacing.xl, flexDirection: 'row', gap: spacing.md }}>
          <Pressable
            onPress={() => {
              setEditName(g.name);
              setEditDesc(g.description);
              setEditCat(g.category);
              setEditAddr(g.address);
              setEditCity(g.city);
              setEditMapsUrl(g.mapsUrl ?? '');
              setEditOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Edit gem"
            style={({ pressed }) => ({
              flex: 1,
              padding: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.primary,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="pencil" size={18} color={colors.primary} style={{ marginRight: spacing.xs }} />
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Edit</Text>
          </Pressable>
          <Pressable
            onPress={confirmDelete}
            disabled={deleting}
            accessibilityRole="button"
            accessibilityLabel="Delete gem"
            style={({ pressed }) => ({
              flex: 1,
              padding: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.danger,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              opacity: pressed || deleting ? 0.6 : 1,
            })}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color={colors.danger} style={{ marginRight: spacing.xs }} />
                <Text style={{ color: colors.danger, fontWeight: '600' }}>
                  {user?.isAdmin && submitterId !== user.id ? 'Delete (admin)' : 'Delete'}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}

      <View style={{ marginTop: spacing.xxl, marginBottom: spacing.md }}>
        <Text style={[text.h2, { marginBottom: spacing.md }]}>
          Comments{commentList.length > 0 ? ` (${commentList.length})` : ''}
        </Text>
      </View>
    </View>
  );

  const renderCommentRow = ({ item }: { item: CommentRowItem }) => {
    const c = item.comment;
    return (
      <View style={{ marginLeft: item.depth ? spacing.lg : 0, paddingLeft: item.depth ? spacing.sm : 0, borderLeftWidth: item.depth ? 2 : 0, borderLeftColor: item.depth ? glass.border : 'transparent', marginBottom: spacing.sm }}>
        <CommentRow
          c={c}
          canDelete={canDelete(c)}
          onDelete={() => deleteComment.mutate(c.id)}
          onReply={!item.isReply && user ? () => startReply(c.id) : undefined}
        />
        {!item.isReply && replyingTo === c.id ? (
          <View style={{ marginLeft: spacing.lg, marginTop: spacing.sm, flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-end' }}>
            <TextInput
              value={replyText}
              onChangeText={setReplyText}
              placeholder={`Reply to ${c.user.displayName}…`}
              placeholderTextColor={colors.textMuted}
              multiline
              autoFocus
              style={{
                flex: 1,
                backgroundColor: glass.fill,
                color: colors.text,
                borderWidth: 1,
                borderColor: glass.border,
                borderRadius: radius.md,
                padding: spacing.sm,
                fontSize: 13,
                maxHeight: 80,
              }}
            />
            <Pressable onPress={cancelReply} hitSlop={8} style={{ padding: spacing.xs }}>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => sendReply(c.id)}
              disabled={createComment.isPending || !replyText.trim()}
              style={({ pressed }) => ({
                backgroundColor: colors.primary,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radius.md,
                opacity: pressed || createComment.isPending || !replyText.trim() ? 0.5 : 1,
              })}
            >
              <Ionicons name="send" size={14} color={colors.bg} />
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AmbientGlow />
      <Stack.Screen options={{ title: g.name }} />
      {g.photoUrl ? (
        <Image source={{ uri: g.photoUrl }} style={{ width: '100%', height: 280, backgroundColor: colors.surfaceAlt }} />
      ) : (
        <View style={{ width: '100%', height: 280, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 80 }}>{categoryEmoji(g.category)}</Text>
        </View>
      )}

      <FlatList
        data={comments.isLoading ? [] : commentRows}
        keyExtractor={(item) => item.id}
        renderItem={renderCommentRow}
        ListHeaderComponent={renderGemContent}
        ListEmptyComponent={
          comments.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.lg }} />
          ) : (
            <Text style={[text.muted, { paddingHorizontal: spacing.lg, paddingBottom: spacing.md }]}>No comments yet.</Text>
          )
        }
        ListFooterComponent={<View style={{ height: spacing.xl }} />}
        contentContainerStyle={{ paddingBottom: spacing.lg }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      {/* Fixed bottom input bar */}
      {user ? (
        <View style={{
          flexDirection: 'row',
          gap: spacing.sm,
          padding: spacing.sm,
          marginBottom: keyboardHeight,
          borderTopWidth: 1,
          borderTopColor: glass.border,
          backgroundColor: colors.bg,
        }}>
          <TextInput
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Add a comment…"
            placeholderTextColor={colors.textMuted}
            multiline
            style={{
              flex: 1,
              backgroundColor: glass.fill,
              color: colors.text,
              borderWidth: 1,
              borderColor: glass.border,
              borderRadius: radius.md,
              padding: spacing.sm,
              fontSize: 14,
              maxHeight: 80,
            }}
          />
          <Pressable
            onPress={sendComment}
            disabled={createComment.isPending || !newComment.trim()}
            style={({ pressed }) => ({
              backgroundColor: colors.primary,
              paddingHorizontal: spacing.lg,
              borderRadius: radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed || createComment.isPending || !newComment.trim() ? 0.5 : 1,
            })}
          >
            {createComment.isPending ? (
              <ActivityIndicator size="small" color={colors.bg} />
            ) : (
              <Ionicons name="send" size={18} color={colors.bg} />
            )}
          </Pressable>
        </View>
      ) : null}

      {/* Edit gem modal */}
      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.lg }} onPress={() => setEditOpen(false)}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.surface, borderRadius: radius.lg, maxHeight: '90%', padding: spacing.lg }}>
            <Text style={[text.h2, { marginBottom: spacing.lg }]}>Edit gem</Text>

            <Text style={[text.muted, { marginBottom: spacing.xs }]}>Name</Text>
            <TextInput value={editName} onChangeText={setEditName} placeholderTextColor={colors.textMuted} maxLength={100}
              style={{ backgroundColor: glass.fill, color: colors.text, borderWidth: 1, borderColor: glass.border, borderRadius: radius.md, padding: spacing.md, fontSize: 16, marginBottom: spacing.md }}
            />

            <Text style={[text.muted, { marginBottom: spacing.xs }]}>Description</Text>
            <TextInput value={editDesc} onChangeText={setEditDesc} placeholderTextColor={colors.textMuted} multiline maxLength={500}
              style={{ backgroundColor: glass.fill, color: colors.text, borderWidth: 1, borderColor: glass.border, borderRadius: radius.md, padding: spacing.md, fontSize: 16, marginBottom: spacing.md, minHeight: 80 }}
            />

            <Text style={[text.muted, { marginBottom: spacing.xs }]}>Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md }}>
              {GEM_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setEditCat(cat)}
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                    borderRadius: radius.pill,
                    backgroundColor: editCat === cat ? colors.primary : glass.fill,
                    borderWidth: 1,
                    borderColor: editCat === cat ? colors.primary : glass.border,
                  }}
                >
                  <Text style={{ color: editCat === cat ? colors.bg : colors.text, fontWeight: '600', fontSize: 13, textTransform: 'capitalize' }}>{cat}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[text.muted, { marginBottom: spacing.xs }]}>Address</Text>
            <TextInput value={editAddr} onChangeText={setEditAddr} placeholderTextColor={colors.textMuted}
              style={{ backgroundColor: glass.fill, color: colors.text, borderWidth: 1, borderColor: glass.border, borderRadius: radius.md, padding: spacing.md, fontSize: 16, marginBottom: spacing.md }}
            />

            <Text style={[text.muted, { marginBottom: spacing.xs }]}>City</Text>
            <TextInput value={editCity} onChangeText={setEditCity} placeholderTextColor={colors.textMuted}
              style={{ backgroundColor: glass.fill, color: colors.text, borderWidth: 1, borderColor: glass.border, borderRadius: radius.md, padding: spacing.md, fontSize: 16, marginBottom: spacing.md }}
            />

            <Text style={[text.muted, { marginBottom: spacing.xs }]}>Google Maps URL (optional)</Text>
            <TextInput value={editMapsUrl} onChangeText={setEditMapsUrl} placeholderTextColor={colors.textMuted} autoCapitalize="none"
              style={{ backgroundColor: glass.fill, color: colors.text, borderWidth: 1, borderColor: glass.border, borderRadius: radius.md, padding: spacing.md, fontSize: 16, marginBottom: spacing.lg }}
            />

            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Pressable onPress={() => setEditOpen(false)}
                style={({ pressed }) => ({ flex: 1, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: glass.border, alignItems: 'center', opacity: pressed ? 0.7 : 1 })}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  if (!editName.trim() || !editDesc.trim() || !editAddr.trim() || !editCity.trim()) return;
                  setEditing(true);
                  try {
                    const updated = await gemsApi.update(id!, {
                      name: editName.trim(),
                      description: editDesc.trim(),
                      category: editCat,
                      address: editAddr.trim(),
                      city: editCity.trim(),
                      mapsUrl: editMapsUrl.trim() || null,
                    });
                    queryClient.setQueryData(['gem', id], updated);
                    queryClient.invalidateQueries({ queryKey: ['gems'] });
                    queryClient.invalidateQueries({ queryKey: ['user-gems'] });
                    setEditOpen(false);
                  } catch {
                    Alert.alert('Update failed', 'Could not save changes. Try again.');
                  } finally {
                    setEditing(false);
                  }
                }}
                disabled={editing || !editName.trim() || !editDesc.trim() || !editAddr.trim() || !editCity.trim()}
                style={({ pressed }) => ({ flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', opacity: pressed || editing || !editName.trim() || !editDesc.trim() || !editAddr.trim() || !editCity.trim() ? 0.6 : 1 })}
              >
                {editing ? (
                  <ActivityIndicator size="small" color={colors.bg} />
                ) : (
                  <Text style={{ color: colors.bg, fontWeight: '600' }}>Save</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

interface CommentRowProps {
  c: Comment;
  canDelete: boolean;
  onDelete: () => void;
  onReply?: () => void;
}

function CommentRow({ c, canDelete, onDelete, onReply }: CommentRowProps) {
  return (
    <View style={{ flexDirection: 'row', paddingVertical: spacing.sm }}>
      {c.user.avatarUrl ? (
        <Image source={{ uri: c.user.avatarUrl }} style={{ width: 28, height: 28, borderRadius: 14, marginRight: spacing.sm }} />
      ) : (
        <View style={{ width: 28, height: 28, borderRadius: 14, marginRight: spacing.sm, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="person" size={14} color={colors.textMuted} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[text.body, { fontWeight: '600', fontSize: 13 }]}>{c.user.displayName}</Text>
          <Text style={[text.muted, { marginLeft: spacing.sm, fontSize: 11 }]}>{formatTimeAgo(c.createdAt)}</Text>
        </View>
        <Text style={[text.body, { marginTop: 2, fontSize: 14, lineHeight: 20 }]}>{c.text}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: spacing.md }}>
          {onReply ? (
            <Pressable onPress={onReply} hitSlop={8} accessibilityRole="button" accessibilityLabel="Reply to comment">
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>Reply</Text>
            </Pressable>
          ) : null}
          {canDelete ? (
            <Pressable onPress={onDelete} hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete comment">
              <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
