import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { OffsetPage, WorkflowEventDto } from '../types';

export interface UseWorkflowEventsParams {
  page: number;
  limit: number;
  type?: string;
}

/** Listado de eventos registrados (offset-paginado). */
export function useWorkflowEvents(params: UseWorkflowEventsParams) {
  return useQuery({
    queryKey: ['workflow-events', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/workflows/events', {
        params: { query: params },
      });
      if (error) throw error;
      return data as unknown as OffsetPage<WorkflowEventDto>;
    },
    placeholderData: keepPreviousData,
  });
}

/** Tipos de evento distintos vistos (para el filtro). */
export function useWorkflowEventTypes() {
  return useQuery({
    queryKey: ['workflow-event-types'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/workflows/events/types');
      if (error) throw error;
      return data as unknown as string[];
    },
    staleTime: 60 * 1000,
  });
}
