import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useDelivery(id: string | undefined) {
  return useQuery({
    queryKey: ['delivery', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/deliveries/{id}', {
        params: { path: { id: id! } },
      });
      if (error) throw error;
      return data;
    },
  });
}
