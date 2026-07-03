import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { FormDto } from '../types';

export function useForm(id: string) {
  return useQuery({
    queryKey: ['form', id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/forms/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
      return data as unknown as FormDto;
    },
    enabled: Boolean(id),
  });
}
