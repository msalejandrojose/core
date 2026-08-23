import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import type { RacingCircuitRotationConfigKey } from '../../types';
import { CIRCUIT_ROTATION_CONFIG_KEY } from './use-circuit-rotation-configs';

export function useUpdateCircuitRotationConfig(
  key: RacingCircuitRotationConfigKey,
  { onSuccess }: { onSuccess?: () => void } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (value: number) => {
      const { data, error } = await apiClient.PATCH(
        '/admin/racing/circuit-rotation-config/{key}',
        { params: { path: { key } }, body: { value } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: CIRCUIT_ROTATION_CONFIG_KEY });
      toast.success('Parámetro actualizado');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al actualizar el parámetro'));
    },
  });
}
