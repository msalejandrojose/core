import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

function useInvalidateParking(id: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['parkings'] });
    void qc.invalidateQueries({ queryKey: ['parking', id] });
  };
}

export function useUnpublishParking(id: string) {
  const invalidate = useInvalidateParking(id);
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await apiClient.POST(
        '/parking/admin/parkings/{id}/unpublish',
        { params: { path: { id } } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess() {
      invalidate();
      toast.success('Plaza despublicada');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'No se pudo despublicar la plaza'));
    },
  });
}

export function useVerifyParking(id: string) {
  const invalidate = useInvalidateParking(id);
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await apiClient.POST(
        '/parking/admin/parkings/{id}/verify',
        { params: { path: { id } } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess() {
      invalidate();
      toast.success('Plaza verificada');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'No se pudo verificar la plaza'));
    },
  });
}

export function useUnverifyParking(id: string) {
  const invalidate = useInvalidateParking(id);
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await apiClient.POST(
        '/parking/admin/parkings/{id}/unverify',
        { params: { path: { id } } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess() {
      invalidate();
      toast.success('Verificación revocada');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'No se pudo revocar la verificación'));
    },
  });
}
