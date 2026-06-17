import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useUserRoles(userId: string) {
  return useQuery({
    queryKey: ['user', userId, 'roles'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/users/{userId}/roles', {
        params: { path: { userId } },
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(userId),
  });
}
