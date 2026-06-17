import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { RoleScope } from '../types';

export interface UseRolesParams {
  page: number;
  limit: number;
  codeContains?: string;
  scope?: RoleScope;
}

/** Listado de roles (offset-paginado). */
export function useRoles(params: UseRolesParams) {
  return useQuery({
    queryKey: ['roles', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/roles', {
        params: { query: params },
      });
      if (error) throw error;
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
