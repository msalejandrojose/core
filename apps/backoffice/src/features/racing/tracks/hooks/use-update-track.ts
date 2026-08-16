import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import type { TrackCellRow, TrackTheme } from '../../types';

export interface UpdateTrackInput {
  name?: string;
  sectorCount?: number;
  minPlausibleMs?: number;
  path?: TrackCellRow[];
  theme?: TrackTheme;
  grip?: number;
  isActive?: boolean;
  /** `null` limpia la imagen; `undefined` la deja tal cual. */
  imageId?: string | null;
}

const KEY = ['racing-tracks'];

export function useUpdateTrack(
  id: string,
  { onSuccess }: { onSuccess?: () => void } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateTrackInput) => {
      const { data, error } = await apiClient.PATCH(
        '/admin/racing/tracks/{id}',
        { params: { path: { id } }, body },
      );
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['racing-track', id] });
      toast.success('Circuito actualizado');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al actualizar el circuito'));
    },
  });
}
