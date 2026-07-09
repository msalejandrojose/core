import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import type { FormDto, FormSchemaJson } from '../types';

export interface CreateFormInput {
  title: string;
  description?: string;
  schema: FormSchemaJson;
}

export function useCreateForm({
  onSuccess,
}: { onSuccess?: (id: string) => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateFormInput) => {
      // El OpenAPI declara el body como objeto genérico (el `schema` es JSON
      // libre validado en el backend); se castea para el cliente tipado.
      const { data, error } = await apiClient.POST('/forms', { body: body as never });
      if (error) throw error;
      return data as unknown as FormDto;
    },
    onSuccess(data) {
      qc.invalidateQueries({ queryKey: ['forms'] });
      toast.success('Formulario creado correctamente');
      onSuccess?.(data.id);
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al crear el formulario'));
    },
  });
}
