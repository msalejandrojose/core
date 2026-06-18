import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

/**
 * Verifica el token de email: `GET /auth/verify-email?token=`. Se ejecuta solo
 * si hay token y no reintenta (un token inválido seguirá inválido).
 */
export function useVerifyEmail(token: string) {
  return useQuery({
    queryKey: ['verify-email', token],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/auth/verify-email', {
        params: { query: { token } },
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(token),
    retry: false,
  });
}
