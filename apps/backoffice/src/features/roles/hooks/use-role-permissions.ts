import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

/** Permisos asignados a un rol: `{ apiSectionId, level }[]`. */
export function useRolePermissions(roleId: string) {
  return useQuery({
    queryKey: ['role-permissions', roleId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        '/roles/{roleId}/permissions',
        { params: { path: { roleId } } },
      );
      if (error) throw error;
      return data;
    },
    enabled: Boolean(roleId),
  });
}
