import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { CursorPage, FormResponseDto } from '../types';

export interface UseFormResponsesParams {
  instanceId: string;
  limit: number;
  cursor?: string;
}

/** Respuestas recibidas por una instancia (cursor-paginado). */
export function useFormResponses({
  instanceId,
  limit,
  cursor,
}: UseFormResponsesParams) {
  return useQuery({
    queryKey: ['form-responses', instanceId, { limit, cursor }],
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        '/forms/instances/{instanceId}/responses',
        { params: { path: { instanceId }, query: { limit, cursor } } },
      );
      if (error) throw error;
      return data as unknown as CursorPage<FormResponseDto>;
    },
    enabled: Boolean(instanceId),
    placeholderData: keepPreviousData,
  });
}
