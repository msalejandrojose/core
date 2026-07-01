import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

/** Métricas agregadas del sistema para el dashboard (GET /dashboard/stats). */
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/dashboard/stats', {});
      if (error) throw error;
      return data;
    },
  });
}
