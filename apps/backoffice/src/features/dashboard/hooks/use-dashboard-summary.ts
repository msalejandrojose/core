import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export interface KpiItem {
  slug: string;
  label: string;
  value: number;
  unit?: 'count' | 'bytes' | 'percent';
  format?: 'integer' | 'decimal';
}

export interface DashboardSummary {
  kpis: KpiItem[];
}

export function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (apiClient as any).GET('/dashboard/summary');
      if (error) throw error;
      return data as DashboardSummary;
    },
    staleTime: 1000 * 60,
  });
}
