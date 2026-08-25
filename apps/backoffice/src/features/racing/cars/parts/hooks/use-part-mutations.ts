import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import type { CarPartCategory } from '../../../types';

export interface CreatePartInput {
  code: string;
  category: CarPartCategory;
  name: string;
  speedScale: number;
  grip: number;
  isActive?: boolean;
}

export interface UpdatePartInput {
  category?: CarPartCategory;
  name?: string;
  speedScale?: number;
  grip?: number;
  isActive?: boolean;
}

const KEY = ['racing-car-parts'];

export function useCreatePart({ onSuccess }: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreatePartInput) => {
      const { data, error } = await apiClient.POST('/admin/racing/car-parts', {
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Pieza creada');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al crear la pieza'));
    },
  });
}

export function useUpdatePart(
  id: string,
  { onSuccess }: { onSuccess?: () => void } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdatePartInput) => {
      const { data, error } = await apiClient.PATCH(
        '/admin/racing/car-parts/{id}',
        { params: { path: { id } }, body },
      );
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Pieza actualizada');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al actualizar la pieza'));
    },
  });
}
