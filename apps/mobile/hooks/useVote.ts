import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gemsApi, type Gem, type PaginatedGems } from '../services/api';

interface VoteContext {
  prevDetail?: Gem;
  prevLists: Array<[readonly unknown[], PaginatedGems | undefined]>;
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

      const prevDetail = qc.getQueryData<Gem>(['gem', gemId]);
      const prevLists = qc.getQueriesData<PaginatedGems>({ queryKey: ['gems'] });

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

      return { prevDetail, prevLists };
    },

    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      if (ctx.prevDetail) qc.setQueryData(['gem', gemId], ctx.prevDetail);
      ctx.prevLists.forEach(([key, data]) => qc.setQueryData(key, data));
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['gem', gemId] });
      qc.invalidateQueries({ queryKey: ['gems'] });
    },
  });
}
