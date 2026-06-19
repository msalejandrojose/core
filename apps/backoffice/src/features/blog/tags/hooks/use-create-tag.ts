import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

export interface CreateTagInput {
  name: string;
  slug?: string;
}

export function useCreateTag({ onSuccess }: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateTagInput) => {
      const { data, error } = await apiClient.POST('/blog/tags', { body });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['blog-tags'] });
      toast.success('Etiqueta creada');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al crear la etiqueta'));
    },
  });
}
