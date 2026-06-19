import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PostStatus } from '../../types';

export interface UsePostsParams {
  limit: number;
  cursor?: string;
  status?: PostStatus;
  categoryId?: string;
  tagId?: string;
  titleContains?: string;
}

/**
 * Listado de posts (cursor-paginado, como Usuarios en BO-06). `placeholderData`
 * mantiene la página anterior mientras carga la siguiente, evitando parpadeos.
 */
export function usePosts(params: UsePostsParams) {
  return useQuery({
    queryKey: ['posts', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/blog/posts', {
        params: { query: params },
      });
      if (error) throw error;
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
