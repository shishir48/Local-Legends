import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gemsApi, type Gem, type PaginatedGems, type UserGemsResponse } from '../services/api';
import { logger } from '../services/logger';

interface VoteContext {
  prevDetail?: Gem;
  prevLists: Array<[readonly unknown[], PaginatedGems | undefined]>;
  prevTop: Array<[readonly unknown[], PaginatedGems | undefined]>;
  prevUser: Array<[readonly unknown[], UserGemsResponse | undefined]>;
}

function updateVoteCountInList<T extends { items: Gem[] }>(
  qc: ReturnType<typeof useQueryClient>,
  entries: Array<[readonly unknown[], T | undefined]>,
  gemId: string,
  delta: 1 | -1
) {
  entries.forEach(([key, data]) => {
    if (!data) return;
    qc.setQueryData(key, {
      ...data,
      items: data.items.map((g) =>
        g.id === gemId
          ? {
              ...g,
              voteCount: g.voteCount + delta,
            }
          : g
      ),
    });
  });
}

/**
 * Toggles a vote on the server while optimistically updating both the
 * gem-detail cache and any cached gem lists. On error, the previous
 * snapshots are restored so the UI rolls back.
 */
export function useVote(gemId: string) {
  const qc = useQueryClient();

  return useMutation<{ voted: boolean; voteCount: number }, Error, void, VoteContext>({
    mutationFn: () => gemsApi.vote(gemId),

    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['gem', gemId] });
      await qc.cancelQueries({ queryKey: ['gems'] });
      await qc.cancelQueries({ queryKey: ['top-gems'] });
      await qc.cancelQueries({ queryKey: ['user-gems'] });

      const prevDetail = qc.getQueryData<Gem>(['gem', gemId]);
      const prevLists = qc.getQueriesData<PaginatedGems>({ queryKey: ['gems'] });
      const prevTop = qc.getQueriesData<PaginatedGems>({ queryKey: ['top-gems'] });
      const prevUser = qc.getQueriesData<UserGemsResponse>({ queryKey: ['user-gems'] });

      if (prevDetail) {
        const nextHasVoted = !prevDetail.hasVoted;
        qc.setQueryData<Gem>(['gem', gemId], {
          ...prevDetail,
          hasVoted: nextHasVoted,
          voteCount: prevDetail.voteCount + (nextHasVoted ? 1 : -1),
        });
      }

      prevLists.forEach(([key, data]) => {
        if (!data) return;
        qc.setQueryData<PaginatedGems>(key, {
          ...data,
          items: data.items.map((g) =>
            g.id === gemId
              ? {
                  ...g,
                  voteCount:
                    g.voteCount + (prevDetail?.hasVoted ? -1 : 1),
                }
              : g
          ),
        });
      });

      const delta: 1 | -1 = prevDetail?.hasVoted ? -1 : 1;
      updateVoteCountInList(qc, prevTop, gemId, delta);
      updateVoteCountInList(qc, prevUser, gemId, delta);

      return { prevDetail, prevLists, prevTop, prevUser };
    },

    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      if (ctx.prevDetail) qc.setQueryData(['gem', gemId], ctx.prevDetail);
      ctx.prevLists.forEach(([key, data]) => qc.setQueryData(key, data));
      ctx.prevTop.forEach(([key, data]) => qc.setQueryData(key, data));
      ctx.prevUser.forEach(([key, data]) => qc.setQueryData(key, data));
    },

    onSuccess: (data) => {
      logger.event('vote_cast', { gemId, voted: data.voted });
    },
  });
}
