import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export const TERRAIN_EFFECTS_KEY = ['racing-terrain-effects'];

/** Los cuatro tipos de terreno de sección — sin paginar, son un conjunto cerrado. */
export function useTerrainEffects() {
  return useQuery({
    queryKey: TERRAIN_EFFECTS_KEY,
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        '/admin/racing/terrain-effects',
      );
      if (error) throw error;
      return data;
    },
  });
}
