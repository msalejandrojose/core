import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

export interface CreateRegionInput {
  code: string;
  name: string;
  countryId: string;
}

export interface UpdateRegionInput {
  code?: string;
  name?: string;
  countryId?: string;
}

const KEY = ['geo-regions'];

export function useCreateRegion({ onSuccess }: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateRegionInput) => {
      const { data, error } = await apiClient.POST('/geo/regions', { body });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Comunidad creada');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al crear la comunidad'));
    },
  });
}

export function useUpdateRegion(
  id: string,
  { onSuccess }: { onSuccess?: () => void } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateRegionInput) => {
      const { data, error } = await apiClient.PATCH('/geo/regions/{id}', {
        params: { path: { id } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Comunidad actualizada');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al actualizar la comunidad'));
    },
  });
}

export function useDeleteRegion({ onSuccess }: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/geo/regions/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['geo-provinces'] });
      toast.success('Comunidad eliminada');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al eliminar la comunidad'));
    },
  });
}
