import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export interface UseCountriesParams {
  page: number;
  limit: number;
  search?: string;
}

/** Listado de países (offset-paginado). */
export function useCountries(params: UseCountriesParams) {
  return useQuery({
    queryKey: ['geo-countries', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/geo/countries', {
        params: { query: params },
      });
      if (error) throw error;
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
