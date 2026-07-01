import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export interface KpiMeta {
  slug: string;
  label: string;
  description?: string;
  category: string;
  unit: 'count' | 'bytes' | 'percent' | 'currency' | 'duration_ms';
  format?: 'integer' | 'decimal' | 'compact';
  hasSeries: boolean;
}

export interface KpiCatalog {
  kpis: KpiMeta[];
}

export function useKpiCatalog() {
  return useQuery<KpiCatalog>({
    queryKey: ['dashboard', 'kpi-catalog'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (apiClient as any).GET('/dashboard/kpis');
      if (error) throw error;
      return data as KpiCatalog;
    },
    staleTime: 1000 * 60 * 5,
  });
}
