import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
}: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateApiSectionInput) => {
      const { data, error } = await apiClient.POST('/api-sections', { body });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['api-sections'] });
      toast.success('Sección creada correctamente');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al crear la sección'));
    },
  });
}
