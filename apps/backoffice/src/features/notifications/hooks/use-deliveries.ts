import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { NotificationChannel } from '@core/shared-types';
import type { Delivery, DeliveryStatus } from '../types';

export interface UseDeliveriesParams {
  limit: number;
  cursor?: string;
  messageTypeKey?: string;
  channel?: NotificationChannel;
  status?: DeliveryStatus;
  to?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface CursorPage<T> {
  data: T[];
  meta: { limit: number; nextCursor: string | null; hasMore: boolean };
}

/** Listado de envíos (log de entregabilidad), cursor-paginado. */
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
