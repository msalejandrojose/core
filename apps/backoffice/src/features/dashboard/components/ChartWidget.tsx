import { useState } from 'react';
import { KpiChart } from './KpiChart';
import { useKpiCatalog } from '../hooks/use-kpi-catalog';
import { getRangeFromPreset, RANGE_PRESETS, type RangePreset } from '../hooks/use-kpi-series';
import type { WidgetType } from '../hooks/use-dashboards';

interface ChartWidgetProps {
  kpiSlug: string;
  widgetType: WidgetType;
}

const WIDGET_CHART_TYPE: Record<string, 'line' | 'bar'> = {
  LINE: 'line',
  BAR: 'bar',
  AREA: 'line',
};

export function ChartWidget({ kpiSlug, widgetType }: ChartWidgetProps) {
  const [preset, setPreset] = useState<RangePreset>(RANGE_PRESETS[1]!);
  const range = getRangeFromPreset(preset);
  const { data: catalog } = useKpiCatalog();
  const meta = catalog?.kpis.find((k) => k.slug === kpiSlug);
  const label = meta?.label ?? kpiSlug;
  const chartType = WIDGET_CHART_TYPE[widgetType] ?? 'line';

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-muted-foreground text-xs">{label}</span>
        <div className="flex gap-1">
          {RANGE_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setPreset(p)}
              className={`rounded px-2 py-0.5 text-xs transition-colors ${
                p.label === preset.label
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <KpiChart
          slug={kpiSlug}
          label={label}
          from={range.from}
          to={range.to}
          granularity={preset.granularity}
          type={chartType}
        />
      </div>
    </div>
  );
}
