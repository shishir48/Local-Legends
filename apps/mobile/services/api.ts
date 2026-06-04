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
  list: (params?: { category?: string; city?: string; sort?: 'votes' | 'recent'; page?: number; limit?: number }) =>
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
};

export const usersApi = {
  gemsBySubmitter: (id: string) =>
    api.get<{ items: Gem[]; totalUpvotes: number }>(`/api/users/${id}/gems`).then((r) => r.data),
  updateMe: (patch: { displayName?: string; avatarUrl?: string | null }) =>
    api.patch<AuthUser>('/api/users/me', patch).then((r) => r.data),
};

export const categoriesApi = {
  list: () => api.get<{ items: Category[] }>('/api/categories').then((r) => r.data),
};

export interface PlacePrediction {
  place_id: string;
  structured_formatting: { main_text: string; secondary_text: string };
  detail: { name: string; address: string; city: string; lat: number; lng: number; mapsUrl: string };
}

export const placesApi = {
  autocomplete: (input: string, city?: string) =>
    api
      .get<{ predictions: PlacePrediction[]; status: string }>('/api/places/autocomplete', {
        params: city ? { input, city } : { input },
      })
      .then((r) => r.data),
};
