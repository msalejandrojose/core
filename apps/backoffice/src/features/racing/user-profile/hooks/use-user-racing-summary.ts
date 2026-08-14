import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

/** Ficha de racing de un jugador: circuitos con intento, mejor tiempo,
 *  posición en el ranking, y el coche que tiene equipado ahora mismo. */
export function useUserRacingSummary(userId: string) {
  return useQuery({
    queryKey: ['racing-user-summary', userId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        '/admin/racing/users/{userId}/summary',
        { params: { path: { userId } } },
      );
      if (error) throw error;
      return data;
    },
    enabled: userId !== '',
  });
}
