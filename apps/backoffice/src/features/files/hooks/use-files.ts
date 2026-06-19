import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { FilesListResponse } from '../types';

export interface UseFilesParams {
  page: number;
  pageSize: number;
}

/**
 * Listado de ficheros (offset). El endpoint responde `{ items, total }` —no el
 * envelope estándar `{ data, meta }`— y el OpenAPI no tipa la respuesta, así que
 * la acotamos a `FilesListResponse`.
 */
export function useFiles(params: UseFilesParams) {
  return useQuery({
    queryKey: ['files', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/files', {
        params: { query: params },
      });
      if (error) throw error;
      return data as unknown as FilesListResponse;
    },
    placeholderData: keepPreviousData,
  });
}
