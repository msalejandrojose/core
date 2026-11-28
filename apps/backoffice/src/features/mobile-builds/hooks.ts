import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import { toast } from '@/lib/toast';
import type { components } from '@core/api-client';

export type MobileBuild = components['schemas']['MobileBuildDto'];
export type MobileBuildList = components['schemas']['MobileBuildListDto'];
export type LaunchMobileBuild = components['schemas']['LaunchMobileBuildDto'];

const KEY = ['mobile-builds'];

export const isActive = (b: Pick<MobileBuild, 'state'>) => b.state === 'QUEUED' || b.state === 'RUNNING';

/** Últimos builds y estado del Mac. Se refresca solo mientras alguno va en marcha. */
export function useMobileBuilds() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/mobile-builds');
      if (error) throw error;
      return data;
    },
    refetchInterval: (query) => (query.state.data?.builds.some(isActive) ? 5000 : 30000),
  });
}

export function useLaunchMobileBuild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: LaunchMobileBuild) => {
      const { data, error } = await apiClient.POST('/admin/mobile-builds', { body });
      if (error) throw error;
      return data;
    },
    onSuccess(b) {
      if (!b) return;
      // Arriba de la lista al momento (y así pasa a refrescarse cada 5 s):
      // la lista de GitHub tarda unos segundos en traerlo.
      qc.setQueryData<MobileBuildList>(KEY, (old) =>
        old ? { ...old, builds: [b, ...old.builds.filter((x) => x.id !== b.id)] } : old,
      );
      toast.success(`Build lanzado: ${b.platform === 'ios' ? 'iOS' : 'Android'} · ${b.profile}`);
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo lanzar el build')),
  });
}

export function useCancelMobileBuild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data, error } = await apiClient.POST('/admin/mobile-builds/{id}/cancel', {
        params: { path: { id } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      void qc.invalidateQueries({ queryKey: KEY });
      toast.success('Cancelando el build');
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo cancelar')),
  });
}

/** Baja el artefacto del build (last-build.json y el .ipa/.apk/.aab, en un zip). */
export function useDownloadMobileBuild() {
  return useMutation({
    mutationFn: async (id: number) => {
      const detail = await apiClient.GET('/admin/mobile-builds/{id}', { params: { path: { id } } });
      if (detail.error) throw detail.error;
      const artifact = detail.data?.artifacts.find((a) => !a.expired);
      if (!artifact) throw new Error('Este build no tiene nada que bajar (o ya caducó).');
      const { data, error } = await apiClient.GET('/admin/mobile-builds/{id}/artifacts/{artifactId}/url', {
        params: { path: { id, artifactId: artifact.id } },
      });
      if (error || !data) throw error ?? new Error('Sin URL de descarga');
      return data.url;
    },
    // La URL firmada vale un minuto: se abre al momento.
    onSuccess(url) {
      window.location.assign(url);
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo bajar el resultado')),
  });
}
