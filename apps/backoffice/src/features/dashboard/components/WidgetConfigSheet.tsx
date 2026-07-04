import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DashboardWidget, WidgetType } from '../hooks/use-dashboards';
import { useKpiCatalog } from '../hooks/use-kpi-catalog';
import { parseConfig, type WidgetConfig } from './widget-config';

interface WidgetConfigSheetProps {
  widget: DashboardWidget | null;
  onClose: () => void;
  onSave: (widgetId: string, config: WidgetConfig) => void;
}

type ChartType = Exclude<WidgetType, 'KPI_CARD'>;
const CHART_TYPES: ChartType[] = ['LINE', 'BAR', 'AREA', 'GAUGE'];
const CHART_TYPE_LABEL: Record<ChartType, string> = {
  LINE: 'Línea',
  BAR: 'Barras',
  AREA: 'Área',
  GAUGE: 'Indicador',
};

const RANGE_OPTIONS = [
  { value: undefined, label: 'Global (heredar)' },
  { value: '24h', label: '24 horas' },
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: '90d', label: '90 días' },
] as const;

export function WidgetConfigSheet({ widget, onClose, onSave }: WidgetConfigSheetProps) {
  const { data: catalog } = useKpiCatalog();
  const meta = widget ? catalog?.kpis.find((k) => k.slug === widget.kpiSlug) : undefined;
  const existing = parseConfig(widget?.config);

  const [title, setTitle] = useState(existing.title ?? '');
  const [subtitle, setSubtitle] = useState(existing.subtitle ?? '');
  const [chartType, setChartType] = useState<ChartType | undefined>(existing.chartType);
  const [range, setRange] = useState<string | undefined>(existing.range);
  const [thresholdGreen, setThresholdGreen] = useState<string>(
    existing.thresholds?.green != null ? String(existing.thresholds.green) : '',
  );
  const [thresholdYellow, setThresholdYellow] = useState<string>(
    existing.thresholds?.yellow != null ? String(existing.thresholds.yellow) : '',
  );
  const [thresholdRed, setThresholdRed] = useState<string>(
    existing.thresholds?.red != null ? String(existing.thresholds.red) : '',
  );

  // Reinicia el formulario cuando cambia el widget seleccionado. Patrón de
  // "ajuste de estado en render" (sin efecto): compara la identidad del widget
  // con la anterior y resincroniza los campos desde su config.
  const [prevWidgetId, setPrevWidgetId] = useState(widget?.id);
  if (widget?.id !== prevWidgetId) {
    setPrevWidgetId(widget?.id);
    setTitle(existing.title ?? '');
    setSubtitle(existing.subtitle ?? '');
    setChartType(existing.chartType);
    setRange(existing.range);
    setThresholdGreen(existing.thresholds?.green != null ? String(existing.thresholds.green) : '');
    setThresholdYellow(existing.thresholds?.yellow != null ? String(existing.thresholds.yellow) : '');
    setThresholdRed(existing.thresholds?.red != null ? String(existing.thresholds.red) : '');
  }

  function handleSave() {
    if (!widget) return;
    const config: WidgetConfig = {
      ...(title.trim() && { title: title.trim() }),
      ...(subtitle.trim() && { subtitle: subtitle.trim() }),
      ...(chartType && { chartType }),
      ...(range && { range: range as WidgetConfig['range'] }),
    };
    const green = thresholdGreen !== '' ? Number(thresholdGreen) : null;
    const yellow = thresholdYellow !== '' ? Number(thresholdYellow) : null;
    const red = thresholdRed !== '' ? Number(thresholdRed) : null;
    if (green != null || yellow != null || red != null) {
      config.thresholds = { green: green ?? undefined, yellow: yellow ?? undefined, red: red ?? undefined };
    }
    onSave(widget.id, config);
    onClose();
  }

  const isCard = widget?.widgetType === 'KPI_CARD';
  const isChart = !isCard;

  return (
    <Dialog open={!!widget} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Configurar widget</DialogTitle>
        </DialogHeader>
        {widget && (
          <div className="space-y-4">
            <p className="text-muted-foreground text-xs">
              {meta?.label ?? widget.kpiSlug} — {widget.widgetType}
            </p>

            {/* Title */}
            <div className="space-y-1.5">
              <Label>Título (override)</Label>
              <Input
                placeholder={meta?.label ?? widget.kpiSlug}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Subtitle */}
            <div className="space-y-1.5">
              <Label>Subtítulo</Label>
              <Input
                placeholder="Descripción opcional…"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
              />
            </div>

            {/* Chart type (only for chart widgets) */}
            {isChart && (
              <div className="space-y-1.5">
                <Label>Tipo de gráfica</Label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setChartType(undefined)}
                    className={`rounded border px-2.5 py-1 text-xs transition-colors ${
                      !chartType ? 'bg-primary text-primary-foreground border-primary' : 'border-border'
                    }`}
                  >
                    Auto
                  </button>
                  {CHART_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setChartType(t)}
                      className={`rounded border px-2.5 py-1 text-xs transition-colors ${
                        chartType === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border'
                      }`}
                    >
                      {CHART_TYPE_LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Range (only for chart widgets) */}
            {isChart && (
              <div className="space-y-1.5">
                <Label>Rango</Label>
                <div className="flex flex-wrap gap-1.5">
                  {RANGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setRange(opt.value)}
                      className={`rounded border px-2.5 py-1 text-xs transition-colors ${
                        range === opt.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Thresholds (only for KPI cards) */}
            {isCard && (
              <div className="space-y-2">
                <Label>Umbrales de color</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-green-600">Verde ≥</p>
                    <Input
                      type="number"
                      placeholder="—"
                      value={thresholdGreen}
                      onChange={(e) => setThresholdGreen(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-yellow-600">Amarillo ≥</p>
                    <Input
                      type="number"
                      placeholder="—"
                      value={thresholdYellow}
                      onChange={(e) => setThresholdYellow(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-red-600">Rojo ≤</p>
                    <Input
                      type="number"
                      placeholder="—"
                      value={thresholdRed}
                      onChange={(e) => setThresholdRed(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>Guardar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
