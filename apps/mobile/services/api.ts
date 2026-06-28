import axios, { type AxiosInstance, type AxiosError } from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '../stores/authStore';

const API_URL =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  'http://localhost:4000';

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

// Attach auth token on every request if logged in.
api.interceptors.request.use((cfg) => {
  const token = useAuthStore.getState().token;
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

// On 401 from a protected endpoint, clear the auth store so the
// router redirects to login on the next render.
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ error?: string }>) => {
    // Import lazily to avoid circular dependency (api → logger → authStore → api)
    import('./logger').then(({ logger }) => {
      logger.error('API error', {
        url: err.config?.url,
        method: err.config?.method,
        status: err.response?.status,
        responseBody: err.response?.data,
      });
    });
    if (err.response?.status === 401) {
      const token = useAuthStore.getState().token;
      if (token) useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  }
);

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  isAdmin?: boolean;
  createdAt?: string;
}

export interface Gem {
  id: string;
  name: string;
  category: 'food' | 'nature' | 'shop' | 'bar' | 'art' | 'other';
  description: string;
  address: string;
  city: string;
  mapsUrl: string | null;
  location: { type: 'Point'; coordinates: [number, number] };
  photoUrl: string | null;
  voteCount: number;
  commentCount: number;
  votedBy: string[];
  submittedBy: { _id: string; displayName: string; avatarUrl: string | null } | string;
  createdAt: string;
  updatedAt: string;
  hasVoted?: boolean;
  isDeleted?: boolean;
}

export interface PaginatedGems {
  items: Gem[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface Category {
  id: string;
  label: string;
  emoji: string;
}

export const authApi = {
  register: (input: { email: string; password: string; displayName: string }) =>
    api.post<{ user: AuthUser; token: string }>('/api/auth/register', input).then((r) => r.data),
  login: (input: { email: string; password: string }) =>
    api.post<{ user: AuthUser; token: string }>('/api/auth/login', input).then((r) => r.data),
  me: () => api.get<AuthUser>('/api/auth/me').then((r) => r.data),
  forgotPassword: (input: { email: string }) =>
    api.post<{ message: string }>('/api/auth/forgot-password', input).then((r) => r.data),
  resetPassword: (input: { email: string; code: string; newPassword: string }) =>
    api.post<{ user: AuthUser; token: string }>('/api/auth/reset-password', input).then((r) => r.data),
};

export const gemsApi = {
  list: (params?: { category?: string; city?: string; sort?: 'votes' | 'recent' | 'search'; page?: number; limit?: number; top?: boolean; new?: boolean; q?: string }) =>
    api.get<PaginatedGems>('/api/gems', { params }).then((r) => r.data),
  nearby: (params: { lat: number; lng: number; radius?: number; limit?: number }) =>
    api.get<{ items: Gem[] }>('/api/gems/nearby', { params }).then((r) => r.data),
  detail: (id: string) => api.get<Gem>(`/api/gems/${id}`).then((r) => r.data),
  create: (form: FormData) =>
    api
      .post<Gem>('/api/gems', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data),
  vote: (id: string) =>
    api.post<{ voted: boolean; voteCount: number }>(`/api/gems/${id}/vote`).then((r) => r.data),
  remove: (id: string) => api.delete<void>(`/api/gems/${id}`).then((r) => r.data),
  update: (id: string, patch: { name?: string; description?: string; category?: Gem['category']; address?: string; city?: string; mapsUrl?: string | null }) =>
    api.patch<Gem>(`/api/gems/${id}`, patch).then((r) => r.data),
  followingFeed: () =>
    api.get<PaginatedGems>('/api/gems/following').then((r) => r.data),
};

export interface PublicUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  followersCount?: number;
  followingCount?: number;
}

export interface UserGemsResponse {
  user: PublicUser;
  items: Gem[];
  totalUpvotes: number;
  isFollowing?: boolean;
}

export const usersApi = {
  gemsBySubmitter: (id: string) =>
    api
      .get<UserGemsResponse>(`/api/users/${id}/gems`)
      .then((r) => r.data),
  updateMe: (patch: { displayName?: string; avatarUrl?: string | null }) =>
    api.patch<AuthUser>('/api/users/me', patch).then((r) => r.data),
  follow: (id: string) =>
    api.post<{ following: boolean; followersCount: number }>(`/api/users/${id}/follow`).then((r) => r.data),
  followers: (id: string) =>
    api.get<{ items: { _id: string; displayName: string; avatarUrl: string | null }[] }>(`/api/users/${id}/followers`).then((r) => r.data),
  following: (id: string) =>
    api.get<{ items: { _id: string; displayName: string; avatarUrl: string | null }[] }>(`/api/users/${id}/following`).then((r) => r.data),
};

export const categoriesApi = {
  list: () => api.get<{ items: Category[] }>('/api/categories').then((r) => r.data),
};

export const pushApi = {
  register: (token: string, platform: 'android') =>
    api.post<void>('/api/push/register', { token, platform }).then((r) => r.data),
  remove: (token: string) =>
    api.delete<void>('/api/push/register', { data: { token } }).then((r) => r.data),
};

export interface Comment {
  id: string;
  text: string;
  user: { _id: string; displayName: string; avatarUrl: string | null };
  createdAt: string;
  parentCommentId: string | null;
}

export const commentsApi = {
  list: (gemId: string) =>
    api.get<{ items: Comment[] }>(`/api/gems/${gemId}/comments`).then((r) => r.data),
  create: (gemId: string, text: string, parentCommentId: string | null = null) =>
    api.post<Comment>(`/api/gems/${gemId}/comments`, { text, parentCommentId }).then((r) => r.data),
  remove: (gemId: string, commentId: string) =>
    api.delete<void>(`/api/gems/${gemId}/comments/${commentId}`).then((r) => r.data),
};

export const appVersionApi = {
  get: () =>
    api
      .get<{ latestRuntimeVersion: string; androidStoreUrl: string }>('/api/app-version')
      .then((r) => r.data),
};

export interface PlaceDetail {
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  mapsUrl: string;
  photoName?: string;
  placeId?: string;
}

export interface PlacePrediction {
  place_id: string;
  structured_formatting: { main_text: string; secondary_text: string };
  // Present only in the Nominatim fallback (no Google key); in Google mode the
  // detail is fetched via placesApi.details on selection.
  detail?: PlaceDetail;
}

export const placesApi = {
  autocomplete: (input: string, city?: string, session?: string) =>
    api
      .get<{ predictions: PlacePrediction[]; status: string }>('/api/places/autocomplete', {
        params: { input, ...(city ? { city } : {}), ...(session ? { session } : {}) },
      })
      .then((r) => r.data),
  details: (placeId: string, session?: string) =>
    api
      .get<PlaceDetail>('/api/places/details', {
        params: { place_id: placeId, ...(session ? { session } : {}) },
      })
      .then((r) => r.data),
};
