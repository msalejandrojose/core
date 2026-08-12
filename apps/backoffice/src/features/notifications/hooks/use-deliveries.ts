import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Delivery, DeliveryStatus } from '../types';

export interface UseDeliveriesParams {
  limit: number;
  cursor?: string;
  messageTypeKey?: string;
  status?: DeliveryStatus;
  to?: string;
}

interface CursorPage<T> {
  data: T[];
  meta: { limit: number; nextCursor: string | null; hasMore: boolean };
}

/** Listado del log de entregabilidad (cursor-paginado). */
export function useDeliveries(params: UseDeliveriesParams) {
  return useQuery({
    queryKey: ['deliveries', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/deliveries', {
        params: { query: params },
      });
      if (error) throw error;
      return data as CursorPage<Delivery>;
    },
    placeholderData: keepPreviousData,
  });
}
