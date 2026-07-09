import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import type { PermissionLevel } from '../types';

/** Upsert del permiso de un rol sobre una sección: `PUT /roles/:roleId/permissions/:sectionId`. */
export function useGrantRolePermission(roleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sectionId,
      level,
    }: {
      sectionId: string;
      level: PermissionLevel;
    }) => {
      const { error } = await apiClient.PUT(
        '/roles/{roleId}/permissions/{sectionId}',
        { params: { path: { roleId, sectionId } }, body: { level } },
      );
      if (error) throw error;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['role-permissions', roleId] });
      toast.success('Permiso actualizado');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al actualizar permiso'));
    },
  });
}
