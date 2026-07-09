import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import type { WorkflowRunDto } from '../types';

/** Reintenta un run fallido desde el step que falló (`POST /workflows/runs/{id}/retry`). */
export function useRetryWorkflowRun(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await apiClient.POST('/workflows/runs/{id}/retry', {
        params: { path: { id } },
      });
      if (error) throw error;
      return data as unknown as WorkflowRunDto;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['workflow-run', id] });
      qc.invalidateQueries({ queryKey: ['workflow-runs'] });
      toast.success('Run reencolado para reintento');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al reintentar el run'));
    },
  });
}
