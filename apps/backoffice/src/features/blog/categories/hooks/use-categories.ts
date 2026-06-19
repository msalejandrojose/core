import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export interface UseCategoriesParams {
  page: number;
  limit: number;
  nameContains?: string;
}

/** Listado de categorías (offset-paginado). */
export function useCategories(params: UseCategoriesParams) {
  return useQuery({
    queryKey: ['blog-categories', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/blog/categories', {
        params: { query: params },
      });
      if (error) throw error;
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
