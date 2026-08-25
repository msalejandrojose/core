import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

export interface CreateGrandPrixInput {
  slug: string;
  name: string;
  trackIds: string[];
  isActive?: boolean;
}

export function useCreateGrandPrix({
  onSuccess,
}: { onSuccess?: (id: string) => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateGrandPrixInput) => {
      const { data, error } = await apiClient.POST('/admin/racing/grand-prix', {
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess(data) {
      qc.invalidateQueries({ queryKey: ['racing-grand-prix-list'] });
      toast.success('Grand Prix creado');
      if (data?.id) onSuccess?.(data.id);
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al crear el Grand Prix'));
    },
  });
}
