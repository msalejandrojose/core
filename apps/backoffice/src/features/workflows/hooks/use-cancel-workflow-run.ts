import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import type { WorkflowRunDto } from '../types';

/** Cancela un run en curso (`POST /workflows/runs/{id}/cancel`). */
export function useCancelWorkflowRun(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await apiClient.POST('/workflows/runs/{id}/cancel', {
        params: { path: { id } },
      });
      if (error) throw error;
      return data as unknown as WorkflowRunDto;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['workflow-run', id] });
      qc.invalidateQueries({ queryKey: ['workflow-runs'] });
      toast.success('Run cancelado');
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al cancelar el run'));
    },
  });
}
