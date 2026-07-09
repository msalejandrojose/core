import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

// `null` en `categoryId`/`coverImageId`/SEO los limpia; un array (incluso vacío)
// en `tagIds` reemplaza el set de etiquetas del post.
export interface UpdatePostInput {
  title?: string;
  content?: string;
  slug?: string;
  excerpt?: string | null;
  categoryId?: string | null;
  tagIds?: string[];
  coverImageId?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export function useUpdatePost(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdatePostInput) => {
      const { data, error } = await apiClient.PATCH('/blog/posts/{id}', {
        params: { path: { id } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['posts'] });
      qc.invalidateQueries({ queryKey: ['post', id] });
      toast.success('Post actualizado');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al actualizar el post'));
    },
  });
}
