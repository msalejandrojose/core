import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

/** Asigna un rol a un usuario: `POST /users/:userId/roles` con `{ roleId }`. */
export function useAssignRole(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await apiClient.POST('/users/{userId}/roles', {
        params: { path: { userId } },
        body: { roleId },
      });
      if (error) throw error;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['user', userId, 'roles'] });
      toast.success('Rol asignado');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al asignar el rol'));
    },
  });
}
