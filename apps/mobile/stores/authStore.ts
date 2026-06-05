import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { AuthUser } from '../services/api';

const TOKEN_KEY = 'll.token';
const USER_KEY = 'll.user';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  login: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isHydrated: false,

  hydrate: async () => {
    try {
      const [token, userJson] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ]);
      const user = userJson ? (JSON.parse(userJson) as AuthUser) : null;
      set({ token, user, isHydrated: true });
    } catch {
      set({ isHydrated: true });
    }
  },

  login: async (token, user) => {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
    ]);
    set({ token, user });
  },

  logout: async () => {
    // Drop this device's push token first (best-effort, needs the auth token).
    // Lazy import avoids the authStore → push → api → authStore cycle.
    await import('../lib/push').then(({ unregisterPush }) => unregisterPush()).catch(() => {});
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(USER_KEY).catch(() => {}),
    ]);
    set({ token: null, user: null });
  },

  setUser: async (user) => {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ user });
  },
}));
