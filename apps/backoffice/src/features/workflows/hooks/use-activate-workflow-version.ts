import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import type { WorkflowDefinitionDto } from '../types';

/** Activa una versión concreta de una key (desactiva las demás). */
export function useActivateWorkflowVersion(key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (version: number) => {
      const { data, error } = await apiClient.POST(
        '/workflows/definitions/{key}/versions/{version}/activate',
        { params: { path: { key, version } } },
      );
      if (error) throw error;
      return data as unknown as WorkflowDefinitionDto;
    },
    onSuccess(def) {
      qc.invalidateQueries({ queryKey: ['workflow-definitions'] });
      qc.invalidateQueries({ queryKey: ['workflow-versions', key] });
      toast.success(`Versión v${def.version} activada`);
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al activar la versión'));
    },
  });
}
