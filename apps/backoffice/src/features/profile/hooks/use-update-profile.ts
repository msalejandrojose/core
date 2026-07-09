import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import { useAuthStore } from '@/store/auth.store';

interface UpdateProfileInput {
  firstName: string | null;
  lastName: string | null;
}

/**
 * Actualiza el nombre del propio usuario vía `PATCH /users/:id` y refleja el
 * cambio en la caché de `['me']` y en el store de sesión (para el UserMenu).
 */
export function useUpdateProfile(id: string) {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (body: UpdateProfileInput) => {
      const { data, error } = await apiClient.PATCH('/users/{id}', {
        params: { path: { id } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess(data) {
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['users'] });
      if (user && data) {
        setUser({
          ...user,
          firstName: data.firstName,
          lastName: data.lastName,
        });
      }
      toast.success('Perfil actualizado');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al actualizar el perfil'));
    },
  });
}
