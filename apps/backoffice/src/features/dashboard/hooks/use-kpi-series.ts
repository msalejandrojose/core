import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export type Granularity = 'hour' | 'day' | 'week' | 'month';

export interface RangePreset {
  label: string;
  days: number;
  granularity: Granularity;
}

export const RANGE_PRESETS: RangePreset[] = [
  { label: '24h', days: 1, granularity: 'hour' },
  { label: '7d', days: 7, granularity: 'day' },
  { label: '30d', days: 30, granularity: 'day' },
  { label: '90d', days: 90, granularity: 'week' },
];

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function getRangeFromPreset(preset: RangePreset): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - preset.days);
  return { from: toDateString(from), to: toDateString(to) };
}

export function useKpiSeries(
  slug: string,
  from: string,
  to: string,
  granularity: Granularity,
  enabled = true,
) {
  return useQuery({
    queryKey: ['dashboard', 'kpi-series', slug, from, to, granularity],
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        '/dashboard/kpis/{slug}/series',
        { params: { path: { slug }, query: { from, to, granularity } } },
      );
      if (error) throw error;
      return data as unknown as {
        slug: string;
        from: string;
        to: string;
        granularity: string;
        points: { t: string; v: number | null }[];
      };
    },
    enabled,
    staleTime: 60_000,
  });
}
