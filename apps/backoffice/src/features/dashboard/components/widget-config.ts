import type { WidgetType } from '../hooks/use-dashboards';

export interface WidgetConfig {
  title?: string;
  subtitle?: string;
  // Charts
  chartType?: Exclude<WidgetType, 'KPI_CARD'>;
  range?: '24h' | '7d' | '30d' | '90d';
  granularity?: 'hour' | 'day' | 'week' | 'month';
  // KPI_CARD
  thresholds?: {
    green?: number | null;
    yellow?: number | null;
    red?: number | null;
  };
}

export function parseConfig(raw: Record<string, unknown> | null | undefined): WidgetConfig {
  if (!raw) return {};
  return raw as WidgetConfig;
}
