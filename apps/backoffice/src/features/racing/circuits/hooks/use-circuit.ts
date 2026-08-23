import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

/** Circuito base por id, con su trazado completo. */
export function useCircuit(id: string) {
  return useQuery({
    queryKey: ['racing-circuit', id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        '/admin/racing/circuits/{id}',
        { params: { path: { id } } },
      );
      if (error) throw error;
      return data;
    },
    enabled: id !== '',
  });
}
