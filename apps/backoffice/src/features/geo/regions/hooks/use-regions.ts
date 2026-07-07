import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export interface UseRegionsParams {
  page: number;
  limit: number;
  search?: string;
  countryId?: string;
}

/** Listado de comunidades autónomas (offset-paginado). */
export function useRegions(params: UseRegionsParams) {
  return useQuery({
    queryKey: ['geo-regions', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/geo/regions', {
        params: { query: params },
      });
      if (error) throw error;
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
