import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

/** Fuerza una rotación de circuitos ya, sin esperar al cron ni al cambio de día. */
export function useRotateCircuits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.POST('/admin/racing/circuits/rotate');
      if (error) throw error;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['racing-circuits'] });
      toast.success('Circuitos rotados');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al rotar los circuitos'));
    },
  });
}
