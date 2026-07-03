import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { CursorPage, FormDto, FormStatus } from '../types';

export interface UseFormsParams {
  limit: number;
  cursor?: string;
  titleContains?: string;
  status?: FormStatus;
}

/** Listado de formularios (cursor-paginado) para la pantalla de gestión. */
export function useForms(params: UseFormsParams) {
  return useQuery({
    queryKey: ['forms', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/forms', {
        params: { query: params },
      });
      if (error) throw error;
      return data as unknown as CursorPage<FormDto>;
    },
    placeholderData: keepPreviousData,
  });
}
