import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

export interface UpdateGrandPrixInput {
  name?: string;
  trackIds?: string[];
  isActive?: boolean;
}

const KEY = ['racing-grand-prix-list'];

export function useUpdateGrandPrix(
  id: string,
  { onSuccess }: { onSuccess?: () => void } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateGrandPrixInput) => {
      const { data, error } = await apiClient.PATCH(
        '/admin/racing/grand-prix/{id}',
        { params: { path: { id } }, body },
      );
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['racing-grand-prix', id] });
      toast.success('Grand Prix actualizado');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al actualizar el Grand Prix'));
    },
  });
}
