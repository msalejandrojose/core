import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { OffsetPage, WorkflowRunDto, WorkflowRunStatus } from '../types';

export interface UseWorkflowRunsParams {
  page: number;
  limit: number;
  status?: WorkflowRunStatus;
  definitionId?: string;
}

/** Listado de runs (offset-paginado, con filtros opcionales). */
export function useWorkflowRuns(params: UseWorkflowRunsParams) {
  return useQuery({
    queryKey: ['workflow-runs', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/workflows/runs', {
        params: { query: params },
      });
      if (error) throw error;
      return data as unknown as OffsetPage<WorkflowRunDto>;
    },
    placeholderData: keepPreviousData,
  });
}
