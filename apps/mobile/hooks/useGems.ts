import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gemsApi, categoriesApi, usersApi, commentsApi, type PaginatedGems, type UserGemsResponse, type Gem } from '../services/api';

function updateGemInPage(
  page: PaginatedGems | undefined,
  gemId: string,
  patch: Partial<Pick<Gem, 'voteCount' | 'commentCount' | 'hasVoted'>>
) {
  if (!page) return page;
  return {
    ...page,
    items: page.items.map((g) => (g.id === gemId ? { ...g, ...patch } : g)),
  };
}

function updateGemInUserResponse(
  data: UserGemsResponse | undefined,
  gemId: string,
  patch: Partial<Pick<Gem, 'voteCount' | 'commentCount' | 'hasVoted'>>
) {
  if (!data) return data;
  return {
    ...data,
    items: data.items.map((g) => (g.id === gemId ? { ...g, ...patch } : g)),
  };
}

export function useGems(opts: { category?: string | null; city?: string | null; sort?: 'votes' | 'recent' | 'search'; q?: string } = {}) {
  return useQuery({
    enabled: !!opts.city,
    queryKey: ['gems', { category: opts.category ?? null, city: opts.city ?? null, sort: opts.sort ?? 'votes', q: opts.q ?? null }],
    queryFn: () =>
      gemsApi.list({
        category: opts.category ?? undefined,
        city: opts.city ?? undefined,
        sort: opts.sort ?? 'votes',
        q: opts.q ?? undefined,
      }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTopGems() {
  return useQuery({
    queryKey: ['top-gems'],
    queryFn: () => gemsApi.list({ top: true }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useNewGems(city: string | null) {
  return useQuery({
    enabled: !!city,
    queryKey: ['new-gems', city],
    queryFn: () => gemsApi.list({ city: city!, new: true }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useGem(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ['gem', id],
    queryFn: () => gemsApi.detail(id!),
    staleTime: 5 * 60 * 1000,
  });
}

export function useNearbyGems(opts: { lat?: number; lng?: number; radius?: number } = {}) {
  return useQuery({
    enabled: opts.lat !== undefined && opts.lng !== undefined,
    queryKey: ['gems', 'nearby', opts],
    queryFn: () => gemsApi.nearby({ lat: opts.lat!, lng: opts.lng!, radius: opts.radius }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
    staleTime: 60 * 60 * 1000, // 1 hour — rarely changes
  });
}

export function useUserGems(userId: string | undefined) {
  return useQuery({
    enabled: !!userId,
    queryKey: ['user-gems', userId],
    queryFn: () => usersApi.gemsBySubmitter(userId!),
    staleTime: 5 * 60 * 1000,
  });
}

export function useComments(gemId: string | undefined) {
  return useQuery({
    enabled: !!gemId,
    queryKey: ['comments', gemId],
    queryFn: () => commentsApi.list(gemId!),
  });
}

export function useCreateComment(gemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { text: string; parentCommentId?: string | null }) =>
      commentsApi.create(gemId, input.text, input.parentCommentId ?? null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', gemId] });
      qc.setQueryData<Gem>(['gem', gemId], (prev) =>
        prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev
      );
      qc.getQueriesData<PaginatedGems>({ queryKey: ['gems'] }).forEach(([key, data]) => {
        qc.setQueryData<PaginatedGems>(key, updateGemInPage(data, gemId, { commentCount: (data?.items.find((g) => g.id === gemId)?.commentCount ?? 0) + 1 }));
      });
      qc.getQueriesData<PaginatedGems>({ queryKey: ['top-gems'] }).forEach(([key, data]) => {
        qc.setQueryData<PaginatedGems>(key, updateGemInPage(data, gemId, { commentCount: (data?.items.find((g) => g.id === gemId)?.commentCount ?? 0) + 1 }));
      });
      qc.getQueriesData<UserGemsResponse>({ queryKey: ['user-gems'] }).forEach(([key, data]) => {
        qc.setQueryData<UserGemsResponse>(key, updateGemInUserResponse(data, gemId, { commentCount: (data?.items.find((g) => g.id === gemId)?.commentCount ?? 0) + 1 }));
      });
    },
  });
}

export function useDeleteComment(gemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => commentsApi.remove(gemId, commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', gemId] });
      qc.setQueryData<Gem>(['gem', gemId], (prev) =>
        prev ? { ...prev, commentCount: Math.max(0, prev.commentCount - 1) } : prev
      );
      qc.getQueriesData<PaginatedGems>({ queryKey: ['gems'] }).forEach(([key, data]) => {
        qc.setQueryData<PaginatedGems>(key, updateGemInPage(data, gemId, { commentCount: Math.max(0, (data?.items.find((g) => g.id === gemId)?.commentCount ?? 0) - 1) }));
      });
      qc.getQueriesData<PaginatedGems>({ queryKey: ['top-gems'] }).forEach(([key, data]) => {
        qc.setQueryData<PaginatedGems>(key, updateGemInPage(data, gemId, { commentCount: Math.max(0, (data?.items.find((g) => g.id === gemId)?.commentCount ?? 0) - 1) }));
      });
      qc.getQueriesData<UserGemsResponse>({ queryKey: ['user-gems'] }).forEach(([key, data]) => {
        qc.setQueryData<UserGemsResponse>(key, updateGemInUserResponse(data, gemId, { commentCount: Math.max(0, (data?.items.find((g) => g.id === gemId)?.commentCount ?? 0) - 1) }));
      });
    },
  });
}

export function useFollow(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => usersApi.follow(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-gems', userId] });
    },
  });
}
