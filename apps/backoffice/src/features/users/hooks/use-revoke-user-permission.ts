import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

/**
 * Revoca el override de permiso de un usuario sobre una sección:
 * `DELETE /users/:userId/permissions/:sectionId`.
 */
export function useRevokeUserPermission(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sectionId: string) => {
      const { error } = await apiClient.DELETE(
        '/users/{userId}/permissions/{sectionId}',
        { params: { path: { userId, sectionId } } },
      );
      if (error) throw error;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['user-permissions', userId] });
      toast.success('Permiso revocado');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al revocar permiso'));
    },
  });
}
