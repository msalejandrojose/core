import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useKpiCatalog, type KpiMeta } from '../hooks/use-kpi-catalog';
import { useKpiValues } from '../hooks/use-kpi-values';
import { useAddWidget, type WidgetType } from '../hooks/use-dashboards';

interface KpiGalleryDialogProps {
  open: boolean;
  onClose: () => void;
  dashboardId: string;
  existingSlugs: string[];
  nextY: number;
}

type ChartType = Exclude<WidgetType, 'KPI_CARD'>;
const CHART_TYPES: ChartType[] = ['LINE', 'BAR', 'AREA', 'GAUGE'];

const CHART_TYPE_LABEL: Record<ChartType, string> = {
  LINE: 'Línea',
  BAR: 'Barras',
  AREA: 'Área',
  GAUGE: 'Indicador',
};

const UNIT_LABEL: Record<string, string> = {
  count: '#',
  bytes: 'B',
  percent: '%',
  currency: '$',
  duration_ms: 'ms',
};

export function KpiGalleryDialog({
  open,
  onClose,
  dashboardId,
  existingSlugs,
  nextY,
}: KpiGalleryDialogProps) {
  const { data: catalog, isLoading } = useKpiCatalog();
  const addWidget = useAddWidget();

  const [search, setSearch] = useState('');
  // Per-KPI selected widget type (defaults to KPI_CARD)
  const [selectedTypes, setSelectedTypes] = useState<Record<string, WidgetType>>({});

  const available = useMemo(() => {
    const kpis = catalog?.kpis ?? [];
    const q = search.toLowerCase();
    return kpis.filter(
      (k) =>
        !existingSlugs.includes(k.slug) &&
        (!q || k.label.toLowerCase().includes(q) || k.slug.toLowerCase().includes(q) || (k.description ?? '').toLowerCase().includes(q)),
    );
  }, [catalog, existingSlugs, search]);

  const byCategory = useMemo(() => {
    const map: Record<string, KpiMeta[]> = {};
    for (const k of available) {
      (map[k.category] ??= []).push(k);
    }
    return map;
  }, [available]);

  const slugsToPreview = useMemo(() => available.map((k) => k.slug), [available]);
  const { data: valuesData } = useKpiValues(slugsToPreview, slugsToPreview.length > 0);
  const valuesMap = useMemo(
    () => Object.fromEntries((valuesData?.values ?? []).map((v) => [v.slug, v.value])),
    [valuesData],
  );

  function getType(slug: string): WidgetType {
    return selectedTypes[slug] ?? 'KPI_CARD';
  }

  function setType(slug: string, type: WidgetType) {
    setSelectedTypes((prev) => ({ ...prev, [slug]: type }));
  }

  function handleAdd(kpi: KpiMeta) {
    const type = getType(kpi.slug);
    const isCard = type === 'KPI_CARD';
    addWidget.mutate(
      {
        dashboardId,
        kpiSlug: kpi.slug,
        widgetType: type,
        x: 0,
        y: nextY,
        w: isCard ? 3 : 12,
        h: isCard ? 2 : 4,
      },
      {
        onSuccess: () => {
          toast.success(`Widget "${kpi.label}" añadido`);
          onClose();
        },
        onError: () => toast.error('No se pudo añadir el widget'),
      },
    );
  }

  function formatPreview(value: number | null | undefined, unit: string): string {
    if (value == null) return '—';
    if (unit === 'bytes') return formatBytes(value);
    if (unit === 'percent') return `${(value * 100).toFixed(1)}%`;
    return value.toLocaleString('es-ES');
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[80vh] max-w-xl flex-col gap-0 p-0">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>Añadir widget</DialogTitle>
        </DialogHeader>

        <div className="border-b px-5 py-3">
          <div className="relative">
            <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              placeholder="Buscar KPI…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-md" />
              ))}
            </div>
          ) : Object.keys(byCategory).length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              {search ? 'Sin resultados.' : 'Todos los KPIs ya están en el dashboard.'}
            </p>
          ) : (
            <div className="space-y-5">
              {Object.entries(byCategory).map(([category, kpis]) => (
                <div key={category}>
                  <h3 className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
                    {category}
                  </h3>
                  <div className="space-y-1">
                    {kpis.map((kpi) => (
                      <KpiGalleryRow
                        key={kpi.slug}
                        kpi={kpi}
                        selectedType={getType(kpi.slug)}
                        onSelectType={(t) => setType(kpi.slug, t)}
                        previewValue={formatPreview(valuesMap[kpi.slug], kpi.unit)}
                        onAdd={() => handleAdd(kpi)}
                        isAdding={addWidget.isPending}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface KpiGalleryRowProps {
  kpi: KpiMeta;
  selectedType: WidgetType;
  onSelectType: (t: WidgetType) => void;
  previewValue: string;
  onAdd: () => void;
  isAdding: boolean;
}

function KpiGalleryRow({ kpi, selectedType, onSelectType, previewValue, onAdd, isAdding }: KpiGalleryRowProps) {
  return (
    <div className="hover:bg-accent flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{kpi.label}</span>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {UNIT_LABEL[kpi.unit] ?? kpi.unit}
          </Badge>
        </div>
        <p className="text-muted-foreground text-xs">{kpi.slug}</p>
      </div>

      <span className="text-muted-foreground w-12 text-right text-xs tabular-nums">
        {previewValue}
      </span>

      {/* Type picker — KPI_CARD always available; chart types only if hasSeries */}
      <div className="flex gap-0.5">
        <TypeButton active={selectedType === 'KPI_CARD'} onClick={() => onSelectType('KPI_CARD')}>
          Tarjeta
        </TypeButton>
        {kpi.hasSeries &&
          CHART_TYPES.map((t) => (
            <TypeButton key={t} active={selectedType === t} onClick={() => onSelectType(t)}>
              {CHART_TYPE_LABEL[t]}
            </TypeButton>
          ))}
      </div>

      <Button size="sm" onClick={onAdd} disabled={isAdding} className="shrink-0">
        Añadir
      </Button>
    </div>
  );
}

function TypeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-1.5 py-0.5 text-xs transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
