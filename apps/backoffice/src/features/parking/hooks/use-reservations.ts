import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { ReservationStatus } from '../types';

export interface UseReservationsParams {
  limit: number;
  cursor?: string;
  status?: ReservationStatus;
  parkingId?: string;
}

export function useReservations(params: UseReservationsParams) {
  return useQuery({
    queryKey: ['parking-reservations', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/parking/admin/reservations', {
        params: { query: params },
      });
      if (error) throw error;
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
