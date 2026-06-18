import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useApiSection(id: string) {
  return useQuery({
    queryKey: ['api-section', id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api-sections/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(id),
  });
}
