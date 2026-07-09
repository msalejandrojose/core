import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
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
        {
          // El OpenAPI del PATCH solo documenta `instanceId` como path param
          // (falta declarar `formId`), pero la URL lo necesita: se envía igual
          // y se castea el tipo. El body también es genérico en el OpenAPI.
          params: { path: { formId, instanceId } as { instanceId: string } },
          body: body as never,
        },
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
