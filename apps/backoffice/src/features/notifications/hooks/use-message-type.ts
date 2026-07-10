import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { MessageType } from '../types';

export function useMessageType(id: string | undefined) {
  return useQuery({
    queryKey: ['message-type', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/message-types/{id}', {
        params: { path: { id: id! } },
      });
      if (error) throw error;
      return data as MessageType;
    },
  });
}
