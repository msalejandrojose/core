import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

export function usePublishPost(id: string, { onSuccess }: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    // `publishedAt` opcional: si es futura el post queda SCHEDULED; si se omite
    // o es pasada, se publica inmediatamente.
    mutationFn: async (body: { publishedAt?: string }) => {
      const { error } = await apiClient.POST('/blog/posts/{id}/publish', {
        params: { path: { id } },
        body,
      });
      if (error) throw error;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['posts'] });
      qc.invalidateQueries({ queryKey: ['post', id] });
      toast.success('Post publicado');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al publicar el post'));
    },
  });
}
