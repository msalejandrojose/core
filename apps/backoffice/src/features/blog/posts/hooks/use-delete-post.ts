import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

export function useDeletePost({ onSuccess }: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/blog/posts/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Post eliminado');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al eliminar el post'));
    },
  });
}
