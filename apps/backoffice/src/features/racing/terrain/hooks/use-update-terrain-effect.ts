import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import type { TerrainType } from '../../types';
import { TERRAIN_EFFECTS_KEY } from './use-terrain-effects';

export interface UpdateTerrainEffectInput {
  grip?: number;
  slowsTopSpeed?: boolean;
}

export function useUpdateTerrainEffect(
  type: TerrainType,
  { onSuccess }: { onSuccess?: () => void } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateTerrainEffectInput) => {
      const { data, error } = await apiClient.PATCH(
        '/admin/racing/terrain-effects/{type}',
        { params: { path: { type } }, body },
      );
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: TERRAIN_EFFECTS_KEY });
      toast.success('Terreno actualizado');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al actualizar el terreno'));
    },
  });
}
