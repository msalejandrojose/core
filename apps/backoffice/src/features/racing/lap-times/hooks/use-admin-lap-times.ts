import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export interface UseAdminLapTimesParams {
  page: number;
  limit: number;
  trackId?: string;
  userId?: string;
}

/** Todos los intentos (válidos e inválidos), filtrables por circuito y jugador. */
export function useAdminLapTimes(params: UseAdminLapTimesParams) {
  return useQuery({
    queryKey: ['racing-admin-lap-times', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/racing/lap-times', {
        params: { query: params },
      });
      if (error) throw error;
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
