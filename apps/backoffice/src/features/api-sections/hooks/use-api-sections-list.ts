import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export interface UseApiSectionsListParams {
  page: number;
  limit: number;
  codeContains?: string;
}

/**
 * Listado de ApiSections (offset-paginado) para la pantalla de gestión.
 * Comparte el prefijo de queryKey `['api-sections', ...]` con el catálogo que
 * usan los paneles de permisos, de modo que invalidar `['api-sections']`
 * refresca ambos.
 */
export function useApiSectionsList(params: UseApiSectionsListParams) {
  return useQuery({
    queryKey: ['api-sections', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api-sections', {
        params: { query: params },
      });
      if (error) throw error;
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
