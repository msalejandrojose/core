import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useKpiSeries, type Granularity } from '../hooks/use-kpi-series';

interface KpiChartProps {
  slug: string;
  label: string;
  from: string;
  to: string;
  granularity: Granularity;
  type?: 'line' | 'bar';
}

export function KpiChart({ slug, label, from, to, granularity, type = 'line' }: KpiChartProps) {
  const { data, isLoading, isError } = useKpiSeries(slug, from, to, granularity);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<import('../../../lib/echarts').echarts.ECharts | null>(null);

  useEffect(() => {
    if (!data || !containerRef.current) return;

    let chart = chartRef.current;
    if (!chart) {
      import('../../../lib/echarts').then(({ echarts }) => {
        if (!containerRef.current) return;
        chart = echarts.init(containerRef.current, null, { renderer: 'canvas' });
        chartRef.current = chart;
        chart.setOption(buildOption(data.points, type, label));
      });
    } else {
      chart.setOption(buildOption(data.points, type, label));
    }
  }, [data, type, label]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const obs = new ResizeObserver(() => chart.resize());
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  return (
    <Card className="flex flex-col gap-3 p-5">
      <span className="text-muted-foreground text-sm font-medium">{label}</span>
      {isError ? (
        <p className="text-muted-foreground py-8 text-center text-xs">
          No se pudo cargar la serie.
        </p>
      ) : isLoading ? (
        <Skeleton className="h-40 w-full rounded" />
      ) : (
        <div ref={containerRef} style={{ height: 160 }} />
      )}
    </Card>
  );
}

function buildOption(
  points: { t: string; v: number | null }[],
  type: 'line' | 'bar',
  name: string,
) {
  const xData = points.map((p) => p.t);
  const yData = points.map((p) => p.v);

  return {
    animation: false,
    grid: { top: 8, right: 8, bottom: 24, left: 40, containLabel: false },
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: { fontSize: 10, color: 'var(--color-muted-foreground)' },
      axisLine: { lineStyle: { color: 'var(--color-border)' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10, color: 'var(--color-muted-foreground)' },
      splitLine: { lineStyle: { color: 'var(--color-border)' } },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'var(--color-popover)',
      borderColor: 'var(--color-border)',
      textStyle: { color: 'var(--color-popover-foreground)', fontSize: 12 },
      formatter: (params: Array<{ name: string; value: number | null }>) => {
        const p = params[0];
        return `${p.name}<br /><b>${p.value ?? '—'}</b>`;
      },
    },
    series: [
      {
        name,
        type,
        data: yData,
        smooth: type === 'line',
        symbol: 'none',
        lineStyle: { width: 2 },
        areaStyle:
          type === 'line'
            ? { opacity: 0.08 }
            : undefined,
        itemStyle: { color: 'var(--color-primary)' },
        color: 'var(--color-primary)',
      },
    ],
  };
}
