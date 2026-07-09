import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

export interface UpdateApiSectionInput {
  name?: string;
  description?: string | null;
  parentSectionId?: string | null;
}

export function useUpdateApiSection(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateApiSectionInput) => {
      const { data, error } = await apiClient.PATCH('/api-sections/{id}', {
        params: { path: { id } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['api-sections'] });
      qc.invalidateQueries({ queryKey: ['api-section', id] });
      toast.success('Sección actualizada');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al actualizar'));
    },
  });
}
