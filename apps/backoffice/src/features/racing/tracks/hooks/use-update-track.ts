import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

// Sin trazado/tema/agarre/imagen (TASK-336): eso vive en el circuito padre,
// se edita vía `useUpdateCircuit`.
export interface UpdateTrackInput {
  name?: string;
  sectorCount?: number;
  minPlausibleMs?: number;
  isActive?: boolean;
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
      toast.success('Variante actualizada');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al actualizar la variante'));
    },
  });
}
