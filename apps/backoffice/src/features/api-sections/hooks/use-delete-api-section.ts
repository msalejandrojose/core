import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

export function useDeleteApiSection({
  onSuccess,
}: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/api-sections/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['api-sections'] });
      toast.success('Sección eliminada');
      onSuccess?.();
    },
    onError(error) {
      toast.error(
        getApiErrorMessage(
          error,
          'No se puede eliminar: la sección está en uso',
        ),
      );
    },
  });
}
