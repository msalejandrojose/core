import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useKpiValues } from '../hooks/use-kpi-values';
import { useKpiCatalog } from '../hooks/use-kpi-catalog';
import type { WidgetConfig } from './widget-config';

interface KpiCardWidgetProps {
  kpiSlug: string;
  config?: WidgetConfig | null;
}

export function KpiCardWidget({ kpiSlug, config }: KpiCardWidgetProps) {
  const { data: catalog } = useKpiCatalog();
  const { data: valuesData, isLoading } = useKpiValues([kpiSlug]);

  const meta = catalog?.kpis.find((k) => k.slug === kpiSlug);
  const valueItem = valuesData?.values[0];
  const value = valueItem?.value;

  const label = config?.title ?? meta?.label ?? kpiSlug;
  const subtitle = config?.subtitle;

  const displayValue =
    value == null
      ? '—'
      : meta?.unit === 'bytes'
        ? formatBytes(value)
        : meta?.unit === 'percent'
          ? `${(value * 100).toFixed(1)}%`
          : value.toLocaleString('es-ES');

  const accentColor = getThresholdColor(value, config?.thresholds);

  return (
    <Card className="flex h-full flex-col justify-between gap-1 p-5">
      <div>
        <span className="text-muted-foreground text-sm">{label}</span>
        {subtitle && <p className="text-muted-foreground text-xs">{subtitle}</p>}
      </div>
      {isLoading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <p
          className="text-3xl font-semibold tracking-tight tabular-nums"
          style={accentColor ? { color: accentColor } : undefined}
        >
          {displayValue}
        </p>
      )}
    </Card>
  );
}

function getThresholdColor(
  value: number | null | undefined,
  thresholds?: WidgetConfig['thresholds'],
): string | undefined {
  if (value == null || !thresholds) return undefined;
  if (thresholds.green != null && value >= thresholds.green) return 'var(--color-chart-2, #22c55e)';
  if (thresholds.yellow != null && value >= thresholds.yellow) return 'var(--color-chart-4, #eab308)';
  if (thresholds.red != null && value <= thresholds.red) return 'var(--color-destructive, #ef4444)';
  return undefined;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
