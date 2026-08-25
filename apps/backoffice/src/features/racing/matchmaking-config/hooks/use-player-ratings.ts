import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export interface UsePlayerRatingsParams {
  page: number;
  limit: number;
}

/** Ranking de rating de la fase online real, de mayor a menor. */
export function usePlayerRatings(params: UsePlayerRatingsParams) {
  return useQuery({
    queryKey: ['racing-player-ratings', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/racing/player-ratings', {
        params: { query: params },
      });
      if (error) throw error;
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
