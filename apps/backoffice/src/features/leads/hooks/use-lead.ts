import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: ['lead', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/leads/{id}', {
        params: { path: { id: id! } },
      });
      if (error) throw error;
      return data;
    },
  });
}
