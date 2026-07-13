import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { ParkingStatus } from '../types';

export interface UseParkingsParams {
  limit: number;
  cursor?: string;
  status?: ParkingStatus;
  hostUserId?: string;
}

export function useParkings(params: UseParkingsParams) {
  return useQuery({
    queryKey: ['parkings', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/parking/admin/parkings', {
        params: { query: params },
      });
      if (error) throw error;
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
