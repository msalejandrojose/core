import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import { toast } from '@/lib/toast';

export function useReprocessWebhookEvent(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await apiClient.POST(
        '/webhook-events/{id}/reprocess',
        { params: { path: { id } } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess(data) {
      qc.invalidateQueries({ queryKey: ['webhook-events'] });
      qc.invalidateQueries({ queryKey: ['webhook-event', id] });
      if (data?.status === 'processed') {
        toast.success('Evento reprocesado correctamente');
      } else {
        toast.warning('El evento se reprocesó pero sigue en estado fallido');
      }
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al reprocesar el evento'));
    },
  });
}
