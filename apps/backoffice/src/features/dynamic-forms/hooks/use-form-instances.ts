import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { CursorPage, FormInstanceDto } from '../types';

/** Instancias (enlaces públicos) de un formulario. */
export function useFormInstances(formId: string) {
  return useQuery({
    queryKey: ['form-instances', formId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/forms/{formId}/instances', {
        params: { path: { formId }, query: { limit: 100 } },
      });
      if (error) throw error;
      return data as unknown as CursorPage<FormInstanceDto>;
    },
    enabled: Boolean(formId),
  });
}
