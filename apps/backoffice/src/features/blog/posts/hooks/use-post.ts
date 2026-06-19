import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

/** Detalle completo de un post (incluye `content`). */
export function usePost(id: string) {
  return useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/blog/posts/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(id),
  });
}
