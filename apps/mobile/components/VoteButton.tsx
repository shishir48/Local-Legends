import { Pressable, Text, View } from 'react-native';
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
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          fontSize: 18,
          marginRight: spacing.sm,
          color: hasVoted ? colors.bg : colors.text,
        }}
      >
        ▲
      </Text>
      <Text
        style={{
          fontSize: 16,
          fontWeight: '700',
          color: hasVoted ? colors.bg : colors.text,
        }}
      >
        {formatVotes(voteCount)}
      </Text>
      <View style={{ width: spacing.sm }} />
      <Text
        style={{
          fontSize: 14,
          color: hasVoted ? colors.bg : colors.textMuted,
        }}
      >
        {hasVoted ? 'Voted' : 'Upvote'}
      </Text>
    </Pressable>
  );
}
