import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export interface UseArchetypesParams {
  page: number;
  limit: number;
  search?: string;
}

/** Listado de arquetipos de administración (activos e inactivos). */
export function useArchetypes(params: UseArchetypesParams) {
  return useQuery({
    queryKey: ['racing-car-archetypes', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/racing/car-archetypes', {
        params: { query: params },
      });
      if (error) throw error;
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
