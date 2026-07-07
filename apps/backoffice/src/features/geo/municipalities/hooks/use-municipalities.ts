import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export interface UseMunicipalitiesParams {
  page: number;
  limit: number;
  search?: string;
  provinceId?: string;
}

/** Listado de municipios (offset-paginado). */
export function useMunicipalities(params: UseMunicipalitiesParams) {
  return useQuery({
    queryKey: ['geo-municipalities', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/geo/municipalities', {
        params: { query: params },
      });
      if (error) throw error;
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
