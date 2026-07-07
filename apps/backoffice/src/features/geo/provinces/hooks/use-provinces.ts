import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export interface UseProvincesParams {
  page: number;
  limit: number;
  search?: string;
  countryId?: string;
  regionId?: string;
}

/** Listado de provincias (offset-paginado). */
export function useProvinces(params: UseProvincesParams) {
  return useQuery({
    queryKey: ['geo-provinces', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/geo/provinces', {
        params: { query: params },
      });
      if (error) throw error;
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
