import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { OffsetPage, WorkflowDefinitionDto } from '../types';

export interface UseWorkflowDefinitionsParams {
  page: number;
  limit: number;
}

/** Listado de definiciones de workflow (versión activa por key, offset-paginado). */
export function useWorkflowDefinitions(params: UseWorkflowDefinitionsParams) {
  return useQuery({
    queryKey: ['workflow-definitions', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/workflows/definitions', {
        params: { query: params },
      });
      if (error) throw error;
      return data as unknown as OffsetPage<WorkflowDefinitionDto>;
    },
    placeholderData: keepPreviousData,
  });
}
