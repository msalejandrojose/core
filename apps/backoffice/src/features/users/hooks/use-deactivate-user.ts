import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

/**
 * Desactiva un usuario (soft delete). El API expone `DELETE /users/:id` que
 * marca `isActive = false`; no se borra físicamente.
 */
export function useDeactivateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.DELETE('/users/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['user', id] });
      toast.success('Usuario desactivado');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al desactivar'));
    },
  });
}
