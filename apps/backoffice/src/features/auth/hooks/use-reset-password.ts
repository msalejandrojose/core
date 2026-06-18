import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

/** Aplica el reset con el token recibido por email: `POST /auth/reset-password`. */
export function useResetPassword() {
  return useMutation({
    mutationFn: async (body: { token: string; password: string }) => {
      const { error } = await apiClient.POST('/auth/reset-password', { body });
      if (error) throw error;
    },
  });
}
