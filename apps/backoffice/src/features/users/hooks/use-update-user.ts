import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

export interface UpdateUserInput {
  firstName?: string | null;
  lastName?: string | null;
  isActive?: boolean;
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateUserInput) => {
      const { data, error } = await apiClient.PATCH('/users/{id}', {
        params: { path: { id } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['user', id] });
      toast.success('Usuario actualizado');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al actualizar'));
    },
  });
}
