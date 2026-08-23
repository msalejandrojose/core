import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export interface UseCircuitsParams {
  page: number;
  limit: number;
  search?: string;
}

/** Listado de circuitos base de administración (activos e inactivos). */
export function useCircuits(params: UseCircuitsParams) {
  return useQuery({
    queryKey: ['racing-circuits', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/racing/circuits', {
        params: { query: params },
      });
      if (error) throw error;
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
