import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import type { FormInstanceDto, FormResponsePolicy } from '../types';

export interface CreateFormInstanceInput {
  responsePolicy?: FormResponsePolicy;
  requiresAuth?: boolean;
  opensAt?: string | null;
  closesAt?: string | null;
  maxResponses?: number | null;
}

export function useCreateFormInstance(formId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateFormInstanceInput) => {
      const { data, error } = await apiClient.POST('/forms/{formId}/instances', {
        params: { path: { formId } },
        // Body genérico en el OpenAPI; el tipo real lo valida el backend.
        body: body as never,
      });
      if (error) throw error;
      return data as unknown as FormInstanceDto;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['form-instances', formId] });
      toast.success('Enlace creado');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al crear el enlace'));
    },
  });
}
