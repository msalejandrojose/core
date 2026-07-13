import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useParking(id: string | undefined) {
  return useQuery({
    queryKey: ['parking', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/parking/admin/parkings/{id}', {
        params: { path: { id: id! } },
      });
      if (error) throw error;
      return data;
    },
  });
}
