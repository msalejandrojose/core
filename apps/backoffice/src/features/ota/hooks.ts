import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import { toast } from '@/lib/toast';
import type { components } from '@core/api-client';

export type OtaBundle = components['schemas']['OtaBundleDto'];
export type OtaBundleList = components['schemas']['OtaBundleListDto'];

const KEY = ['ota', 'bundles'];

/** Subidas de una app y canal (sin app: la primera que haya). */
export function useOtaBundles(appId: string | null, channel: string | null) {
  return useQuery({
    queryKey: [...KEY, appId, channel],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/ota/bundles', {
        params: { query: { ...(appId ? { appId } : {}), ...(channel ? { channel } : {}) } },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useSetOtaBundleEnabled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
      const { data, error } = await apiClient.PATCH('/admin/ota/bundles/{id}', {
        params: { path: { id } },
        body: { isEnabled },
      });
      if (error) throw error;
      return data;
    },
    onSuccess(b) {
      void qc.invalidateQueries({ queryKey: KEY });
      toast.success(b?.isEnabled ? `${b.version} activada` : `${b?.version} desactivada`);
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo cambiar')),
  });
}

export function useDeleteOtaBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/admin/ota/bundles/{id}', { params: { path: { id } } });
      if (error) throw error;
    },
    onSuccess() {
      void qc.invalidateQueries({ queryKey: KEY });
      toast.success('Zip borrado del almacenamiento');
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo borrar')),
  });
}

export function usePurgeOta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ appId, channel }: { appId: string; channel: string }) => {
      const { data, error } = await apiClient.POST('/admin/ota/bundles/purge', {
        params: { query: { appId, channel } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess(r) {
      void qc.invalidateQueries({ queryKey: KEY });
      toast.success(r?.removed ? `Zips borrados: ${r.removed}` : 'No sobraba ninguno');
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo limpiar')),
  });
}
