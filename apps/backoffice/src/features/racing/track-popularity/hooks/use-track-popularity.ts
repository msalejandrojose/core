import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

/** Actividad por circuito para el reporte de "qué se juega y qué se
 *  abandona" (TASK-240) — sin paginar, el número de circuitos es pequeño y
 *  estable, igual que la configuración de matchmaking. */
export function useTrackPopularity() {
  return useQuery({
    queryKey: ['racing-track-popularity'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/racing/track-popularity');
      if (error) throw error;
      return data;
    },
  });
}
