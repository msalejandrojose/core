import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

export interface CreateProvinceInput {
  code: string;
  name: string;
  countryId: string;
  regionId?: string | null;
}

export interface UpdateProvinceInput {
  code?: string;
  name?: string;
  countryId?: string;
  regionId?: string | null;
}

const KEY = ['geo-provinces'];

export function useCreateProvince({ onSuccess }: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateProvinceInput) => {
      const { data, error } = await apiClient.POST('/geo/provinces', { body });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Provincia creada');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al crear la provincia'));
    },
  });
}

export function useUpdateProvince(
  id: string,
  { onSuccess }: { onSuccess?: () => void } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateProvinceInput) => {
      const { data, error } = await apiClient.PATCH('/geo/provinces/{id}', {
        params: { path: { id } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Provincia actualizada');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al actualizar la provincia'));
    },
  });
}

export function useDeleteProvince({ onSuccess }: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/geo/provinces/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['geo-municipalities'] });
      toast.success('Provincia eliminada');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al eliminar la provincia'));
    },
  });
}
