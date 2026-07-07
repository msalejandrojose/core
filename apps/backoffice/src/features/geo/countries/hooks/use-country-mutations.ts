import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

export interface CreateCountryInput {
  iso2: string;
  iso3: string;
  numericCode?: string;
  name: string;
  nativeName?: string;
  phoneCode?: string;
  isActive?: boolean;
}

export interface UpdateCountryInput {
  iso2?: string;
  iso3?: string;
  numericCode?: string | null;
  name?: string;
  nativeName?: string | null;
  phoneCode?: string | null;
  isActive?: boolean;
}

const KEY = ['geo-countries'];

export function useCreateCountry({ onSuccess }: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateCountryInput) => {
      const { data, error } = await apiClient.POST('/geo/countries', { body });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('País creado');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al crear el país'));
    },
  });
}

export function useUpdateCountry(
  id: string,
  { onSuccess }: { onSuccess?: () => void } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateCountryInput) => {
      const { data, error } = await apiClient.PATCH('/geo/countries/{id}', {
        params: { path: { id } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('País actualizado');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al actualizar el país'));
    },
  });
}

export function useDeleteCountry({ onSuccess }: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/geo/countries/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('País eliminado');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al eliminar el país'));
    },
  });
}
