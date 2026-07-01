import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useKpiValues } from '../hooks/use-kpi-values';
import { useKpiCatalog } from '../hooks/use-kpi-catalog';

interface KpiCardWidgetProps {
  kpiSlug: string;
}

export function KpiCardWidget({ kpiSlug }: KpiCardWidgetProps) {
  const { data: catalog } = useKpiCatalog();
  const { data: valuesData, isLoading } = useKpiValues([kpiSlug]);

  const meta = catalog?.kpis.find((k) => k.slug === kpiSlug);
  const valueItem = valuesData?.values[0];

  const label = meta?.label ?? kpiSlug;
  const value = valueItem?.value;
  const displayValue =
    value == null
      ? '—'
      : meta?.unit === 'bytes'
        ? formatBytes(value)
        : value.toLocaleString('es-ES');

  return (
    <Card className="flex h-full flex-col justify-between gap-2 p-5">
      <span className="text-muted-foreground text-sm">{label}</span>
      {isLoading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <p className="text-3xl font-semibold tracking-tight tabular-nums">{displayValue}</p>
      )}
    </Card>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
