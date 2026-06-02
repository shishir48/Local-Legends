import { Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVote } from '../hooks/useVote';
import { useAuthStore } from '../stores/authStore';
import { useRouter } from 'expo-router';
import { colors, radius, spacing } from '../utils/theme';
import { formatVotes } from '../utils/format';

interface Props {
  gemId: string;
  voteCount: number;
  hasVoted: boolean;
}

export function VoteButton({ gemId, voteCount, hasVoted }: Props) {
  const vote = useVote(gemId);
  const token = useAuthStore((s) => s.token);
  const router = useRouter();

  const onPress = () => {
    if (!token) {
      router.push('/(auth)/login');
      return;
    }
    vote.mutate();
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={vote.isPending}
      accessibilityRole="button"
      accessibilityState={{ selected: hasVoted, disabled: vote.isPending }}
      accessibilityLabel={hasVoted ? `Voted, ${voteCount} votes. Tap to remove vote` : `Upvote, ${voteCount} votes`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: radius.pill,
        backgroundColor: hasVoted ? colors.primary : colors.surface,
        borderWidth: 2,
        borderColor: hasVoted ? colors.primary : colors.border,
        transform: [{ scale: pressed ? 0.96 : 1 }],
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Ionicons
        name={hasVoted ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
        size={22}
        color={hasVoted ? colors.bg : colors.text}
        style={{ marginRight: spacing.sm }}
      />
      <Text style={{ fontSize: 16, fontWeight: '700', color: hasVoted ? colors.bg : colors.text }}>
        {formatVotes(voteCount)}
      </Text>
      <Text style={{ fontSize: 14, marginLeft: spacing.sm, color: hasVoted ? colors.bg : colors.textMuted }}>
        {hasVoted ? 'Voted' : 'Upvote'}
      </Text>
    </Pressable>
  );
}
