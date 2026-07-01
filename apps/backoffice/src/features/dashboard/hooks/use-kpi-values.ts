import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export interface KpiValueItem {
  slug: string;
  value: number | null;
  error?: string;
}

export interface KpiValuesBatch {
  values: KpiValueItem[];
}

export function useKpiValues(slugs: string[], enabled = true) {
  return useQuery<KpiValuesBatch>({
    queryKey: ['dashboard', 'kpi-values', slugs],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (apiClient as any).POST('/dashboard/kpis/values', {
        body: { slugs },
      });
      if (error) throw error;
      return data as KpiValuesBatch;
    },
    enabled: enabled && slugs.length > 0,
    staleTime: 1000 * 30,
  });
}
