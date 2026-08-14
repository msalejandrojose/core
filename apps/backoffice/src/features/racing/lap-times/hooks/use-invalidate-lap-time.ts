import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

export function useInvalidateLapTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await apiClient.POST(
        '/admin/racing/lap-times/{id}/invalidate',
        { params: { path: { id } } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['racing-admin-lap-times'] });
      toast.success('Tiempo anulado');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al anular el tiempo'));
    },
  });
}
