import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

/** Grand Prix por id, con sus circuitos en orden. */
export function useGrandPrix(id: string) {
  return useQuery({
    queryKey: ['racing-grand-prix', id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        '/admin/racing/grand-prix/{id}',
        { params: { path: { id } } },
      );
      if (error) throw error;
      return data;
    },
    enabled: id !== '',
  });
}
