import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

function useInvalidateHostVerifications() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: ['host-verifications'] });
}

export function useApproveHostVerification() {
  const invalidate = useInvalidateHostVerifications();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await apiClient.POST(
        '/parking/admin/host-verifications/{id}/approve',
        { params: { path: { id } } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess() {
      invalidate();
      toast.success('Verificación aprobada');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'No se pudo aprobar la verificación'));
    },
  });
}

export function useRejectHostVerification() {
  const invalidate = useInvalidateHostVerifications();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data, error } = await apiClient.POST(
        '/parking/admin/host-verifications/{id}/reject',
        { params: { path: { id } }, body: { reason } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess() {
      invalidate();
      toast.success('Verificación rechazada');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'No se pudo rechazar la verificación'));
    },
  });
}
