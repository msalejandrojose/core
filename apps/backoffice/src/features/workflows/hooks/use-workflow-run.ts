import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { isRunActive, type WorkflowRunDetailDto } from '../types';

/**
 * Detalle de un run (run + steps + pending actions). Mientras el run sigue vivo
 * (RUNNING/WAITING) se refresca en segundo plano para reflejar el avance.
 */
export function useWorkflowRun(id: string) {
  return useQuery({
    queryKey: ['workflow-run', id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/workflows/runs/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
      return data as unknown as WorkflowRunDetailDto;
    },
    enabled: Boolean(id),
    refetchInterval: (query) =>
      query.state.data && isRunActive(query.state.data.run.status) ? 4000 : false,
  });
}
