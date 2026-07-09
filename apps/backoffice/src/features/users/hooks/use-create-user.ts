import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

export interface CreateUserInput {
  email: string;
  password: string;
  userType: 'BACKOFFICE' | 'APP';
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

export function useCreateUser({ onSuccess }: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateUserInput) => {
      const { data, error } = await apiClient.POST('/users', { body });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario creado correctamente');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al crear el usuario'));
    },
  });
}
