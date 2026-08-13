import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

export interface CreateArchetypeInput {
  code: string;
  name: string;
  speedScale: number;
  grip: number;
  offroadGripModifier: number;
  isActive?: boolean;
}

export interface UpdateArchetypeInput {
  name?: string;
  speedScale?: number;
  grip?: number;
  offroadGripModifier?: number;
  isActive?: boolean;
}

const KEY = ['racing-car-archetypes'];

export function useCreateArchetype({
  onSuccess,
}: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateArchetypeInput) => {
      const { data, error } = await apiClient.POST(
        '/admin/racing/car-archetypes',
        { body },
      );
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Arquetipo creado');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al crear el arquetipo'));
    },
  });
}

export function useUpdateArchetype(
  id: string,
  { onSuccess }: { onSuccess?: () => void } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateArchetypeInput) => {
      const { data, error } = await apiClient.PATCH(
        '/admin/racing/car-archetypes/{id}',
        { params: { path: { id } }, body },
      );
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Arquetipo actualizado');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al actualizar el arquetipo'));
    },
  });
}
