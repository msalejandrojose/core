import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

export interface CreateApiSectionInput {
  code: string;
  name: string;
  description?: string;
  parentSectionId?: string;
}

export function useCreateApiSection({
  onSuccess,
}: { onSuccess?: (id: string) => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateApiSectionInput) => {
      const { data, error } = await apiClient.POST('/api-sections', { body });
      if (error) throw error;
      return data;
    },
    onSuccess(data) {
      qc.invalidateQueries({ queryKey: ['api-sections'] });
      toast.success('Sección creada correctamente');
      onSuccess?.(data!.id);
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al crear la sección'));
    },
  });
}
