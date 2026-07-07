import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export interface UsePostalCodesParams {
  page: number;
  limit: number;
  search?: string;
  municipalityId?: string;
}

/** Listado de códigos postales (offset-paginado). */
export function usePostalCodes(params: UsePostalCodesParams) {
  return useQuery({
    queryKey: ['geo-postal-codes', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/geo/postal-codes', {
        params: { query: params },
      });
      if (error) throw error;
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
