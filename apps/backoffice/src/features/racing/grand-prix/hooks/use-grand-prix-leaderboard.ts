import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

/** Clasificación agregada del Grand Prix. Reutiliza el endpoint de jugador
 *  (`/racing/grand-prix/{id}/leaderboard`): es de solo lectura y no hay
 *  ningún dato ahí que no deba ver un admin logueado. */
export function useGrandPrixLeaderboard(id: string) {
  return useQuery({
    queryKey: ['racing-grand-prix-leaderboard', id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        '/racing/grand-prix/{id}/leaderboard',
        { params: { path: { id }, query: { limit: 50 } } },
      );
      if (error) throw error;
      return data;
    },
    enabled: id !== '',
  });
}
