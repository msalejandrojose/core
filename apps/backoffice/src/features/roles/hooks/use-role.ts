import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useRole(id: string) {
  return useQuery({
    queryKey: ['role', id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/roles/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(id),
  });
}
