import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gemsApi, categoriesApi, usersApi, commentsApi } from '../services/api';

export function useGems(opts: { category?: string | null; city?: string | null; sort?: 'votes' | 'recent'; top?: boolean } = {}) {
  return useQuery({
    enabled: opts.top ? true : !!opts.city,
    queryKey: ['gems', { category: opts.category ?? null, city: opts.city ?? null, sort: opts.sort ?? 'votes', top: opts.top ?? false }],
    queryFn: () =>
      gemsApi.list({
        category: opts.category ?? undefined,
        city: opts.city ?? undefined,
        sort: opts.sort ?? 'votes',
        top: opts.top ?? undefined,
      }),
  });
}

export function useGem(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ['gem', id],
    queryFn: () => gemsApi.detail(id!),
  });
}

export function useNearbyGems(opts: { lat?: number; lng?: number; radius?: number } = {}) {
  return useQuery({
    enabled: opts.lat !== undefined && opts.lng !== undefined,
    queryKey: ['gems', 'nearby', opts],
    queryFn: () => gemsApi.nearby({ lat: opts.lat!, lng: opts.lng!, radius: opts.radius }),
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
      qc.invalidateQueries({ queryKey: ['gem', gemId] });
      qc.invalidateQueries({ queryKey: ['gems'] });
    },
  });
}

export function useDeleteComment(gemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => commentsApi.remove(gemId, commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', gemId] });
      qc.invalidateQueries({ queryKey: ['gem', gemId] });
      qc.invalidateQueries({ queryKey: ['gems'] });
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
