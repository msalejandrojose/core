import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import type { PermissionLevel } from '@/features/roles/types';
import { getApiErrorMessage } from '@/lib/api-error';

/**
 * Upsert del override de permiso de un usuario sobre una sección:
 * `PUT /users/:userId/permissions/:sectionId`.
 */
export function useGrantUserPermission(userId: string) {
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
        '/users/{userId}/permissions/{sectionId}',
        { params: { path: { userId, sectionId } }, body: { level } },
      );
      if (error) throw error;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['user-permissions', userId] });
      toast.success('Permiso actualizado');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al actualizar permiso'));
    },
  });
}
