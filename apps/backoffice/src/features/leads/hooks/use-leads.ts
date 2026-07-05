import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { LeadSource, LeadStatus } from '../types';

export interface UseLeadsParams {
  limit: number;
  cursor?: string;
  status?: LeadStatus;
  source?: LeadSource;
  ownerId?: string;
  tagId?: string;
  q?: string;
}

export function useLeads(params: UseLeadsParams) {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/leads', {
        params: { query: params },
      });
      if (error) throw error;
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
