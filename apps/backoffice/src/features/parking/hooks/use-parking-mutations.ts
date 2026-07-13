import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

export function useUnpublishParking(id: string) {
  const qc = useQueryClient();
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
      void qc.invalidateQueries({ queryKey: ['parkings'] });
      void qc.invalidateQueries({ queryKey: ['parking', id] });
      toast.success('Plaza despublicada');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'No se pudo despublicar la plaza'));
    },
  });
}
