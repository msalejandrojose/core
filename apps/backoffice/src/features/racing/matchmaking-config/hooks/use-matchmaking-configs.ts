import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export const MATCHMAKING_CONFIG_KEY = ['racing-matchmaking-configs'];

/** Las tres claves de matchmaking de la fase online real — sin paginar, son
 *  un conjunto cerrado. */
export function useMatchmakingConfigs() {
  return useQuery({
    queryKey: MATCHMAKING_CONFIG_KEY,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/racing/matchmaking-config');
      if (error) throw error;
      return data;
    },
  });
}
