import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import type { FormDto, FormSchemaJson, FormStatus } from '../types';

export interface UpdateFormInput {
  title?: string;
  description?: string | null;
  schema?: FormSchemaJson;
  status?: FormStatus;
}

export function useUpdateForm(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateFormInput) => {
      const { data, error } = await apiClient.PATCH('/forms/{id}', {
        params: { path: { id } },
        // Body genérico en el OpenAPI; el tipo real lo valida el backend.
        body: body as never,
      });
      if (error) throw error;
      return data as unknown as FormDto;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['forms'] });
      qc.invalidateQueries({ queryKey: ['form', id] });
      toast.success('Formulario actualizado');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al actualizar el formulario'));
    },
  });
}
