import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

export function useDeleteCategory({
  onSuccess,
}: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/blog/categories/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['blog-categories'] });
      // Los posts pueden haber quedado sin categoría (el API hace SetNull).
      qc.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Categoría eliminada');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al eliminar la categoría'));
    },
  });
}
