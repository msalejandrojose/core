import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useWebhookEvent(id: string | undefined) {
  return useQuery({
    queryKey: ['webhook-event', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/webhook-events/{id}', {
        params: { path: { id: id! } },
      });
      if (error) throw error;
      return data;
    },
  });
}
