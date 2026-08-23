import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import type { TrackCellRow, TrackTheme } from '../../types';

export interface UpdateCircuitInput {
  name?: string;
  checkpoints?: number;
  path?: TrackCellRow[];
  theme?: TrackTheme;
  grip?: number;
  isActive?: boolean;
  /** `null` limpia la imagen; `undefined` la deja tal cual. */
  imageId?: string | null;
}

const KEY = ['racing-circuits'];

export function useUpdateCircuit(
  id: string,
  { onSuccess }: { onSuccess?: () => void } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateCircuitInput) => {
      const { data, error } = await apiClient.PATCH(
        '/admin/racing/circuits/{id}',
        { params: { path: { id } }, body },
      );
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['racing-circuit', id] });
      toast.success('Circuito actualizado');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al actualizar el circuito'));
    },
  });
}
