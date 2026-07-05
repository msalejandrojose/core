import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useLeadActivities(id: string | undefined, cursor?: string) {
  return useQuery({
    queryKey: ['lead-activities', id, cursor],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/leads/{id}/activities', {
        params: { path: { id: id! }, query: { limit: 20, cursor } },
      });
      if (error) throw error;
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
