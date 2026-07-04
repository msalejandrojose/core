import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { WorkflowDefinitionDto } from '../types';

/**
 * Histórico de versiones de una key de workflow, ordenado como lo devuelve la
 * API (versión más reciente primero). Incluye la versión activa (`isActive`).
 */
export function useWorkflowVersions(key: string) {
  return useQuery({
    queryKey: ['workflow-versions', key],
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        '/workflows/definitions/{key}/versions',
        { params: { path: { key } } },
      );
      if (error) throw error;
      return data as unknown as WorkflowDefinitionDto[];
    },
    enabled: Boolean(key),
  });
}
