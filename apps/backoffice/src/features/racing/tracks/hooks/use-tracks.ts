import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export interface UseTracksParams {
  page: number;
  limit: number;
  search?: string;
}

/** Listado de circuitos de administración (activos e inactivos). */
export function useTracks(params: UseTracksParams) {
  return useQuery({
    queryKey: ['racing-tracks', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/racing/tracks', {
        params: { query: params },
      });
      if (error) throw error;
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
