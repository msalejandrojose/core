import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import type { RoleScope } from '../types';

export interface UpdateRoleInput {
  name?: string;
  description?: string | null;
  scope?: RoleScope;
  parentRoleId?: string | null;
}

export function useUpdateRole(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateRoleInput) => {
      const { data, error } = await apiClient.PATCH('/roles/{id}', {
        params: { path: { id } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['roles'] });
      qc.invalidateQueries({ queryKey: ['role', id] });
      toast.success('Rol actualizado');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al actualizar'));
    },
  });
}
