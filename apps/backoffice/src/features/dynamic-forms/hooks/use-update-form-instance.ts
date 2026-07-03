import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import type {
  FormInstanceDto,
  FormInstanceStatus,
  FormResponsePolicy,
} from '../types';

export interface UpdateFormInstanceInput {
  responsePolicy?: FormResponsePolicy;
  requiresAuth?: boolean;
  opensAt?: string | null;
  closesAt?: string | null;
  maxResponses?: number | null;
  status?: FormInstanceStatus;
}

export function useUpdateFormInstance(formId: string, instanceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateFormInstanceInput) => {
      const { data, error } = await apiClient.PATCH(
        '/forms/{formId}/instances/{instanceId}',
        { params: { path: { formId, instanceId } }, body },
      );
      if (error) throw error;
      return data as unknown as FormInstanceDto;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['form-instances', formId] });
      toast.success('Enlace actualizado');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al actualizar el enlace'));
    },
  });
}
