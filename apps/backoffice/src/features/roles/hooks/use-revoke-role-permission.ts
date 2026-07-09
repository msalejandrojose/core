import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

/** Revoca el permiso de un rol sobre una sección: `DELETE /roles/:roleId/permissions/:sectionId`. */
export function useRevokeRolePermission(roleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sectionId: string) => {
      const { error } = await apiClient.DELETE(
        '/roles/{roleId}/permissions/{sectionId}',
        { params: { path: { roleId, sectionId } } },
      );
      if (error) throw error;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['role-permissions', roleId] });
      toast.success('Permiso revocado');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al revocar permiso'));
    },
  });
}
