import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import type { TrackCellRow, TrackTheme } from '../../types';

export interface CreateTrackInput {
  slug: string;
  name: string;
  sectorCount: number;
  minPlausibleMs: number;
  path: TrackCellRow[];
  theme: TrackTheme;
  grip: number;
  isActive?: boolean;
}

export function useCreateTrack({ onSuccess }: { onSuccess?: (id: string) => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateTrackInput) => {
      const { data, error } = await apiClient.POST('/admin/racing/tracks', {
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess(data) {
      qc.invalidateQueries({ queryKey: ['racing-tracks'] });
      toast.success('Circuito creado');
      if (data?.id) onSuccess?.(data.id);
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al crear el circuito'));
    },
  });
}
