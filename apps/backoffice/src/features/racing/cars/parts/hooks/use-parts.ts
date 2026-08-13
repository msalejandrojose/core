import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { CarPartCategory } from '../../../types';

export interface UsePartsParams {
  page: number;
  limit: number;
  search?: string;
  category?: CarPartCategory;
}

/** Listado de piezas de administración (activas e inactivas). */
export function useParts(params: UsePartsParams) {
  return useQuery({
    queryKey: ['racing-car-parts', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/racing/car-parts', {
        params: { query: params },
      });
      if (error) throw error;
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
