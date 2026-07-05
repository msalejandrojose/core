import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

export function useLeadTags() {
  return useQuery({
    queryKey: ['lead-tags'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/leads/tags');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateLeadTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; color?: string }) => {
      const { data, error } = await apiClient.POST('/leads/tags', { body });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['lead-tags'] });
      toast.success('Etiqueta creada');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al crear la etiqueta'));
    },
  });
}
