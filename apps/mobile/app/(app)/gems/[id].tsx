import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Keyboard, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
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
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AmbientGlow />
      <Stack.Screen options={{ title: g.name }} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
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

        {canDeleteGem ? (
          <Pressable
            onPress={confirmDelete}
            disabled={deleting}
            accessibilityRole="button"
            accessibilityLabel="Delete gem"
            style={({ pressed }) => ({
              marginTop: spacing.xl,
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
                  {user?.isAdmin && submitterId !== user.id ? 'Delete gem (admin)' : 'Delete gem'}
                </Text>
              </>
            )}
          </Pressable>
        ) : null}

        {/* Comments list */}
        <View style={{ marginTop: spacing.xxl, marginBottom: spacing.md }}>
          <Text style={[text.h2, { marginBottom: spacing.md }]}>
            Comments{commentList.length > 0 ? ` (${commentList.length})` : ''}
          </Text>

          {comments.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.lg }} />
          ) : commentList.length === 0 ? (
            <Text style={[text.muted, { marginBottom: spacing.md }]}>No comments yet.</Text>
          ) : (
            topLevel.map((c) => {
              const replies = repliesByParent.get(c.id) ?? [];
              return (
                <View key={c.id} style={{ marginBottom: spacing.md }}>
                  <CommentRow
                    c={c}
                    canDelete={canDelete(c)}
                    onDelete={() => deleteComment.mutate(c.id)}
                    onReply={user ? () => startReply(c.id) : undefined}
                  />
                  {replies.map((r) => (
                    <View key={r.id} style={{ marginLeft: spacing.lg, marginTop: spacing.xs, paddingLeft: spacing.sm, borderLeftWidth: 2, borderLeftColor: glass.border }}>
                      <CommentRow
                        c={r}
                        canDelete={canDelete(r)}
                        onDelete={() => deleteComment.mutate(r.id)}
                      />
                    </View>
                  ))}
                  {replyingTo === c.id ? (
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
                      <Pressable
                        onPress={cancelReply}
                        hitSlop={8}
                        style={{ padding: spacing.xs }}
                      >
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
            })
          )}
        </View>
      </View>
      </ScrollView>

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