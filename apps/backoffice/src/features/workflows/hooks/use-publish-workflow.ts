import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import type { WorkflowDefinitionDto, WorkflowDslJson } from '../types';

/**
 * Publica una versión de workflow (`POST /workflows/definitions`). El body es el
 * DSL completo; la API valida con Zod y deduplica por (key, version). La primera
 * versión de una key queda activa; las siguientes nacen inactivas.
 */
export function usePublishWorkflow({
  onSuccess,
}: { onSuccess?: (def: WorkflowDefinitionDto) => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dsl: WorkflowDslJson) => {
      const { data, error } = await apiClient.POST('/workflows/definitions', {
        body: dsl as unknown as Record<string, never>,
      });
      if (error) throw error;
      return data as unknown as WorkflowDefinitionDto;
    },
    onSuccess(def) {
      qc.invalidateQueries({ queryKey: ['workflow-definitions'] });
      qc.invalidateQueries({ queryKey: ['workflow-versions', def.key] });
      toast.success(`Workflow «${def.name}» v${def.version} publicado`);
      onSuccess?.(def);
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al publicar el workflow'));
    },
  });
}
