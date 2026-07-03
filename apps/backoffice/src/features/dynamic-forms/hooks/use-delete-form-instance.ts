import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

export function useDeleteFormInstance(formId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (instanceId: string) => {
      const { error } = await apiClient.DELETE(
        '/forms/{formId}/instances/{instanceId}',
        { params: { path: { formId, instanceId } } },
      );
      if (error) throw error;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['form-instances', formId] });
      toast.success('Enlace eliminado');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'No se pudo eliminar el enlace'));
    },
  });
}
