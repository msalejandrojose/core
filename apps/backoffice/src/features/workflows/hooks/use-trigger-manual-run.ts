import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import type { WorkflowRunDto } from '../types';

/**
 * Disparo manual de la versión activa de un workflow
 * (`POST /workflows/definitions/{key}/run`). El body es el payload del evento
 * sintético.
 */
export function useTriggerManualRun(key: string, { onSuccess }: { onSuccess?: (run: WorkflowRunDto) => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await apiClient.POST('/workflows/definitions/{key}/run', {
        params: { path: { key } },
        body: payload as unknown as Record<string, never>,
      });
      if (error) throw error;
      return data as unknown as WorkflowRunDto;
    },
    onSuccess(run) {
      qc.invalidateQueries({ queryKey: ['workflow-runs'] });
      toast.success('Run iniciado');
      onSuccess?.(run);
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al iniciar el run'));
    },
  });
}
