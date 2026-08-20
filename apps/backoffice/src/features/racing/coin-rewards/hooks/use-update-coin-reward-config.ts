import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import type { RacingCoinRewardKey } from '../../types';
import { COIN_REWARD_CONFIGS_KEY } from './use-coin-reward-configs';

export function useUpdateCoinRewardConfig(
  key: RacingCoinRewardKey,
  { onSuccess }: { onSuccess?: () => void } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (amount: number) => {
      const { data, error } = await apiClient.PATCH(
        '/admin/racing/coin-rewards/{key}',
        { params: { path: { key } }, body: { amount } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: COIN_REWARD_CONFIGS_KEY });
      toast.success('Importe actualizado');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al actualizar el importe'));
    },
  });
}
