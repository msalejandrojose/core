import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { HostVerificationStatus } from '../types';

export interface UseHostVerificationsParams {
  limit: number;
  cursor?: string;
  status?: HostVerificationStatus;
}

export function useHostVerifications(params: UseHostVerificationsParams) {
  return useQuery({
    queryKey: ['host-verifications', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        '/parking/admin/host-verifications',
        { params: { query: params } },
      );
      if (error) throw error;
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
