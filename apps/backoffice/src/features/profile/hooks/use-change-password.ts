import { useMutation } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

/** Cambio de contraseña del usuario autenticado: `POST /auth/change-password`. */
export function useChangePassword({
  onSuccess,
}: { onSuccess?: () => void } = {}) {
  return useMutation({
    mutationFn: async (body: ChangePasswordInput) => {
      const { error } = await apiClient.POST('/auth/change-password', { body });
      if (error) throw error;
    },
    onSuccess() {
      toast.success('Contraseña actualizada');
      onSuccess?.();
    },
    onError(error) {
      toast.error(
        getApiErrorMessage(error, 'No se pudo cambiar la contraseña'),
      );
    },
  });
}
