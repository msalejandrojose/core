import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export interface UseGrandPrixListParams {
  page: number;
  limit: number;
  search?: string;
}

/** Listado de Grand Prix de administración (activos e inactivos). */
export function useGrandPrixList(params: UseGrandPrixListParams) {
  return useQuery({
    queryKey: ['racing-grand-prix-list', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/racing/grand-prix', {
        params: { query: params },
      });
      if (error) throw error;
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
