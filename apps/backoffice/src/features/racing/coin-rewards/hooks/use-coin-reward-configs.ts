import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export const COIN_REWARD_CONFIGS_KEY = ['racing-coin-reward-configs'];

/** Las nueve claves de la economía de monedas — sin paginar, son un conjunto cerrado. */
export function useCoinRewardConfigs() {
  return useQuery({
    queryKey: COIN_REWARD_CONFIGS_KEY,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/racing/coin-rewards');
      if (error) throw error;
      return data;
    },
  });
}
