import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

/** Usuario autenticado: `GET /auth/me`. */
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/auth/me');
      if (error) throw error;
      return data;
    },
  });
}
