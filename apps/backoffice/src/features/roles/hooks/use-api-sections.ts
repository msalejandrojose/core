import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

/**
 * Catálogo de ApiSections (para el panel de permisos del rol). Se piden hasta
 * 100 — suficiente para el catálogo actual; si crece habrá que paginar.
 */
export function useApiSections() {
  return useQuery({
    queryKey: ['api-sections'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api-sections', {
        params: { query: { limit: 100 } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}
