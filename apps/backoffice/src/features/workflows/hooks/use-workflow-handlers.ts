import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { RegisteredHandlerInfo } from '../types';

/**
 * Catálogo de action keys registradas en el motor (handlers externos). Las
 * acciones del propio motor (`ENGINE_ACTIONS`) no aparecen aquí; el editor las
 * añade aparte.
 */
export function useWorkflowHandlers() {
  return useQuery({
    queryKey: ['workflow-handlers'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/workflows/handlers');
      if (error) throw error;
      return data as unknown as RegisteredHandlerInfo[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
