import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import type { GrandPrixDifficulty } from '../../types';

export interface CreateGrandPrixStageInput {
  trackId: string;
  laps: number;
}

export interface CreateGrandPrixInput {
  slug: string;
  name: string;
  stages: CreateGrandPrixStageInput[];
  isActive?: boolean;
  difficulty?: GrandPrixDifficulty;
  creditsReward?: number;
  xpReward?: number;
  imageId?: string | null;
}

export function useCreateGrandPrix({
  onSuccess,
}: { onSuccess?: (id: string) => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateGrandPrixInput) => {
      const { data, error } = await apiClient.POST('/admin/racing/grand-prix', {
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess(data) {
      qc.invalidateQueries({ queryKey: ['racing-grand-prix-list'] });
      toast.success('Grand Prix creado');
      if (data?.id) onSuccess?.(data.id);
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al crear el Grand Prix'));
    },
  });
}
