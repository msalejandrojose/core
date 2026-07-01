import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useKpiValues } from '../hooks/use-kpi-values';
import { useKpiCatalog } from '../hooks/use-kpi-catalog';
import type { WidgetConfig } from './widget-config';

interface GaugeWidgetProps {
  kpiSlug: string;
  config?: WidgetConfig | null;
}

export function GaugeWidget({ kpiSlug, config }: GaugeWidgetProps) {
  const { data: catalog } = useKpiCatalog();
  const { data: valuesData, isLoading } = useKpiValues([kpiSlug]);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<import('../../../lib/echarts').echarts.ECharts | null>(null);

  const meta = catalog?.kpis.find((k) => k.slug === kpiSlug);
  const valueItem = valuesData?.values[0];
  const rawValue = valueItem?.value ?? 0;
  const isPercent = meta?.unit === 'percent';
  const displayValue = isPercent ? rawValue * 100 : rawValue;
  const label = config?.title ?? meta?.label ?? kpiSlug;

  useEffect(() => {
    if (isLoading || !containerRef.current) return;

    import('../../../lib/echarts').then(({ echarts }) => {
      if (!containerRef.current) return;
      if (!chartRef.current) {
        chartRef.current = echarts.init(containerRef.current, null, { renderer: 'canvas' });
      }
      chartRef.current.setOption(buildGaugeOption(displayValue, label, isPercent));
    });
  }, [displayValue, label, isPercent, isLoading]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const obs = new ResizeObserver(() => chart.resize());
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => () => { chartRef.current?.dispose(); chartRef.current = null; }, []);

  return (
    <Card className="flex h-full flex-col items-center justify-center gap-1 p-4">
      <span className="text-muted-foreground text-sm">{label}</span>
      {isLoading ? (
        <Skeleton className="h-24 w-24 rounded-full" />
      ) : (
        <div ref={containerRef} style={{ width: '100%', height: '80%', minHeight: 80 }} />
      )}
    </Card>
  );
}

function buildGaugeOption(value: number, name: string, isPercent: boolean) {
  const max = isPercent ? 100 : undefined;
  const formatter = isPercent ? '{value}%' : '{value}';

  return {
    animation: true,
    series: [
      {
        type: 'gauge',
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: max ?? Math.max(value * 1.5, 10),
        splitNumber: 4,
        itemStyle: { color: 'var(--color-primary)' },
        progress: { show: true, width: 10 },
        pointer: { show: false },
        axisLine: {
          lineStyle: { width: 10, color: [[1, 'var(--color-border)']] },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        anchor: { show: false },
        title: { show: false },
        detail: {
          valueAnimation: true,
          width: '60%',
          lineHeight: 40,
          borderRadius: 8,
          offsetCenter: [0, '10%'],
          fontSize: 20,
          fontWeight: 'bolder',
          color: 'inherit',
          formatter,
        },
        data: [{ value: parseFloat(value.toFixed(1)), name }],
      },
    ],
  };
}
