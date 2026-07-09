import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { SendingAccountType } from '../types';

/** Tipos de cuenta de envío (lista completa, sin paginar). */
export function useAccountTypes() {
  return useQuery({
    queryKey: ['sending-account-types'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/sending-account-types');
      if (error) throw error;
      return (data ?? []) as SendingAccountType[];
    },
    staleTime: 1000 * 60 * 5,
  });
}
