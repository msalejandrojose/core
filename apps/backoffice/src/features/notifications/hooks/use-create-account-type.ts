import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import { toast } from '@/lib/toast';
import type { NotificationChannel } from '../types';

export interface CreateAccountTypeInput {
  key: string;
  name: string;
  channel: NotificationChannel;
}

// Crea un tipo de cuenta de envío. El backend copia el `configSchema` y
// `messageSchema` del catálogo de canales según el `channel` elegido.
export function useCreateAccountType({
  onSuccess,
}: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateAccountTypeInput) => {
      const { data, error } = await apiClient.POST('/sending-account-types', {
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['sending-account-types'] });
      toast.success('Tipo de cuenta creado');
      onSuccess?.();
    },
    onError(error) {
      toast.error(getApiErrorMessage(error, 'Error al crear el tipo de cuenta'));
    },
  });
}
