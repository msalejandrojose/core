import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export interface UseTagsParams {
  page: number;
  limit: number;
  nameContains?: string;
}

/** Listado de etiquetas (offset-paginado). */
export function useTags(params: UseTagsParams) {
  return useQuery({
    queryKey: ['blog-tags', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/blog/tags', {
        params: { query: params },
      });
      if (error) throw error;
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
