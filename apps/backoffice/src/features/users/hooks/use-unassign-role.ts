import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

/** Quita un rol de un usuario: `DELETE /users/:userId/roles/:roleId`. */
export function useUnassignRole(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await apiClient.DELETE(
        '/users/{userId}/roles/{roleId}',
        { params: { path: { userId, roleId } } },
      );
      if (error) throw error;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['user', userId, 'roles'] });
      toast.success('Rol quitado');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al quitar el rol'));
    },
  });
}
