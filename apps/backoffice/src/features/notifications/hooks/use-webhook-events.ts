import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { WebhookEvent, WebhookEventStatus } from '../types';

export interface UseWebhookEventsParams {
  limit: number;
  cursor?: string;
  source?: string;
  status?: WebhookEventStatus;
  dateFrom?: string;
  dateTo?: string;
}

interface CursorPage<T> {
  data: T[];
  meta: { limit: number; nextCursor: string | null; hasMore: boolean };
}

/** Listado de eventos entrantes por webhook, cursor-paginado. */
export function useWebhookEvents(params: UseWebhookEventsParams) {
  return useQuery({
    queryKey: ['webhook-events', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/webhook-events', {
        params: { query: params },
      });
      if (error) throw error;
      return data as CursorPage<WebhookEvent>;
    },
    placeholderData: keepPreviousData,
  });
}
