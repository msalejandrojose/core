import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export interface UseUsersParams {
  limit: number;
  cursor?: string;
  emailContains?: string;
  userType?: 'BACKOFFICE' | 'APP';
  isActive?: boolean;
}

/**
 * Listado de usuarios (cursor-paginado). `placeholderData` mantiene la página
 * anterior visible mientras se carga la siguiente, evitando parpadeos al paginar.
 */
export function useUsers(params: UseUsersParams) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/users', {
        params: { query: params },
      });
      if (error) throw error;
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
