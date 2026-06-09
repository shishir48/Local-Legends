import { useMutation } from '@tanstack/react-query';
import { authApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { logger } from '../services/logger';

export function useLogin() {
  const login = useAuthStore((s) => s.login);
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: async ({ token, user }) => {
      await login(token, user);
      logger.event('user_login', { userId: user.id });
    },
  });
}

export function useRegister() {
  const login = useAuthStore((s) => s.login);
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: async ({ token, user }) => {
      await login(token, user);
      logger.event('user_register', { userId: user.id });
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: () => logger.event('password_reset_requested'),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: async ({ user }) => {
      logger.event('password_reset_completed', { userId: user.id });
    },
  });
}
