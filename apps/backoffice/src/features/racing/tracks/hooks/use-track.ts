import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

/** Circuito por id, con su trazado completo. */
export function useTrack(id: string) {
  return useQuery({
    queryKey: ['racing-track', id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        '/admin/racing/tracks/{id}',
        { params: { path: { id } } },
      );
      if (error) throw error;
      return data;
    },
    enabled: id !== '',
  });
}
