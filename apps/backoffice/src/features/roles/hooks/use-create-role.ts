import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import type { RoleScope } from '../types';

export interface CreateRoleInput {
  code: string;
  name: string;
  scope: RoleScope;
  description?: string;
  parentRoleId?: string;
}

export function useCreateRole({ onSuccess }: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateRoleInput) => {
      const { data, error } = await apiClient.POST('/roles', { body });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Rol creado correctamente');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al crear el rol'));
    },
  });
}
