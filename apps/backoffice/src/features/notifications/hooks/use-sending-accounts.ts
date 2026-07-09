import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { SendingAccount } from '../types';

export interface UseSendingAccountsParams {
  limit: number;
  cursor?: string;
  typeId?: string;
  isActive?: boolean;
}

interface CursorPage<T> {
  data: T[];
  meta: { limit: number; nextCursor: string | null; hasMore: boolean };
}

/** Listado de cuentas de envío (cursor-paginado). */
export function useSendingAccounts(params: UseSendingAccountsParams) {
  return useQuery({
    queryKey: ['sending-accounts', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/sending-accounts', {
        params: { query: params },
      });
      if (error) throw error;
      return data as CursorPage<SendingAccount>;
    },
    placeholderData: keepPreviousData,
  });
}
