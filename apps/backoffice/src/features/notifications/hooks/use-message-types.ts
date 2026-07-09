import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { MessageType } from '../types';

export interface UseMessageTypesParams {
  limit: number;
  cursor?: string;
  accountId?: string;
  isActive?: boolean;
}

interface CursorPage<T> {
  data: T[];
  meta: { limit: number; nextCursor: string | null; hasMore: boolean };
}

/** Listado de tipos de mensaje (cursor-paginado). */
export function useMessageTypes(params: UseMessageTypesParams) {
  return useQuery({
    queryKey: ['message-types', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/message-types', {
        params: { query: params },
      });
      if (error) throw error;
      return data as CursorPage<MessageType>;
    },
    placeholderData: keepPreviousData,
  });
}
