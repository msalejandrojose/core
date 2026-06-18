import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

/** Overrides de permisos directos del usuario: `{ apiSectionId, level }[]`. */
export function useUserPermissions(userId: string) {
  return useQuery({
    queryKey: ['user-permissions', userId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        '/users/{userId}/permissions',
        { params: { path: { userId } } },
      );
      if (error) throw error;
      return data;
    },
    enabled: Boolean(userId),
  });
}
