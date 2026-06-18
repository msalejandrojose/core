import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

/**
 * Solicita el reset de contraseña: `POST /auth/request-password-reset`.
 * Por seguridad la API responde igual exista o no la cuenta, así que la UI
 * muestra siempre el mismo mensaje de confirmación.
 */
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await apiClient.POST('/auth/request-password-reset', {
        body: { email },
      });
      if (error) throw error;
    },
  });
}
