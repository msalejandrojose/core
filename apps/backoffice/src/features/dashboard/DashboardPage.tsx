import {
  ChevronDown,
  Edit2,
  Files,
  Newspaper,
  Plus,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartWidget } from './components/ChartWidget';
import { KpiCardWidget } from './components/KpiCardWidget';
import {
  useAddWidget,
  useCreateDashboard,
  useDashboard,
  useDashboards,
  useDeleteDashboard,
  useRemoveWidget,
  useSaveLayout,
  useUpdateDashboard,
  type Dashboard,
  type DashboardWidget,
  type LayoutWidget,
  type WidgetType,
} from './hooks/use-dashboards';
import { useKpiCatalog } from './hooks/use-kpi-catalog';

// 12-column grid, each "row" is ~100px
const GRID_COLS = 12;
const ROW_H = 100;

export function DashboardPage() {
  const { data, isLoading } = useDashboards();
  const dashboards = data?.dashboards ?? [];
  const defaultDashboard = dashboards.find((d) => d.isDefault) ?? dashboards[0];

  const [activeDashboardId, setActiveDashboardId] = useState<string | undefined>(undefined);
  const effectiveId = activeDashboardId ?? defaultDashboard?.id;

  if (isLoading) return <DashboardPageSkeleton />;

  return (
    <DashboardPageContent
      dashboards={dashboards}
      activeDashboardId={effectiveId}
      onSelectDashboard={setActiveDashboardId}
    />
  );
}

// ─── Inner component with resolved dashboard ID ───────────────────────────────

interface DashboardPageContentProps {
  dashboards: Dashboard[];
  activeDashboardId: string | undefined;
  onSelectDashboard: (id: string) => void;
}

function DashboardPageContent({
  dashboards,
  activeDashboardId,
  onSelectDashboard,
}: DashboardPageContentProps) {
  const { data: dashboard, isLoading } = useDashboard(activeDashboardId);
  const [editMode, setEditMode] = useState(false);
  const [addWidgetOpen, setAddWidgetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);

  const saveLayout = useSaveLayout();
  const removeWidget = useRemoveWidget();
  const deleteDashboard = useDeleteDashboard();

  function handleRemoveWidget(widget: DashboardWidget) {
    if (!dashboard) return;
    removeWidget.mutate(
      { dashboardId: dashboard.id, widgetId: widget.id },
      { onError: () => toast.error('No se pudo eliminar el widget') },
    );
  }

  function handleSaveLayout(widgets: LayoutWidget[]) {
    if (!dashboard) return;
    saveLayout.mutate(
      { dashboardId: dashboard.id, widgets },
      {
        onSuccess: () => {
          toast.success('Layout guardado');
          setEditMode(false);
        },
        onError: () => toast.error('No se pudo guardar el layout'),
      },
    );
  }

  function handleDeleteDashboard() {
    if (!dashboard) return;
    const targetId = dashboard.id;
    deleteDashboard.mutate(targetId, {
      onSuccess: () => {
        toast.success('Dashboard eliminado');
        const remaining = dashboards.find((d) => d.id !== targetId);
        if (remaining) onSelectDashboard(remaining.id);
      },
      onError: (e: Error) => toast.error(e.message ?? 'No se pudo eliminar'),
    });
  }

  const activeDashboard = dashboards.find((d) => d.id === activeDashboardId) ?? dashboards[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <PageHeader title="Dashboard" description={activeDashboard?.name} />
          {dashboards.length > 1 && (
            <DashboardSelector
              dashboards={dashboards}
              activeDashboardId={activeDashboardId}
              onSelect={onSelectDashboard}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          {editMode && dashboard && (
            <>
              <Button variant="outline" size="sm" onClick={() => setAddWidgetOpen(true)}>
                <Plus className="size-4" />
                Añadir widget
              </Button>
              <Button
                size="sm"
                onClick={() => handleSaveLayout(dashboard.widgets.map(widgetToLayout))}
                disabled={saveLayout.isPending}
              >
                Guardar
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit2 className="size-4" />
                <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditMode((v) => !v)}>
                {editMode ? 'Salir del editor' : 'Editar layout'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                Renombrar dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                Nuevo dashboard
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleDeleteDashboard}
                disabled={dashboards.length <= 1}
              >
                Eliminar dashboard
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Grid */}
      {isLoading || !dashboard ? (
        <DashboardGridSkeleton />
      ) : (
        <DashboardGrid
          dashboard={dashboard}
          editMode={editMode}
          onRemoveWidget={handleRemoveWidget}
        />
      )}

      {/* Dialogs */}
      {dashboard && (
        <AddWidgetDialog
          open={addWidgetOpen}
          onClose={() => setAddWidgetOpen(false)}
          dashboardId={dashboard.id}
          existingSlugs={dashboard.widgets.map((w) => w.kpiSlug)}
          nextY={nextY(dashboard.widgets)}
        />
      )}
      <CreateDashboardDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => onSelectDashboard(id)}
      />
      {dashboard && (
        <RenameDashboardDialog
          open={renameOpen}
          onClose={() => setRenameOpen(false)}
          dashboard={dashboard}
        />
      )}
    </div>
  );
}

// ─── Dashboard Grid ───────────────────────────────────────────────────────────

interface DashboardGridProps {
  dashboard: Dashboard;
  editMode: boolean;
  onRemoveWidget: (widget: DashboardWidget) => void;
}

function DashboardGrid({ dashboard, editMode, onRemoveWidget }: DashboardGridProps) {
  if (dashboard.widgets.length === 0) {
    return (
      <div className="text-muted-foreground flex h-48 items-center justify-center rounded-lg border border-dashed text-sm">
        No hay widgets. Activa el modo edición para añadir.
      </div>
    );
  }

  const maxRow = Math.max(...dashboard.widgets.map((w) => w.y + w.h));

  return (
    <div
      className="relative"
      style={{ height: maxRow * ROW_H }}
    >
      {/* Grid lines in edit mode */}
      {editMode && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(to right, var(--color-border) 0, var(--color-border) 1px, transparent 1px, transparent ${100 / GRID_COLS}%)`,
            opacity: 0.4,
          }}
        />
      )}
      {dashboard.widgets.map((widget) => (
        <div
          key={widget.id}
          className={`absolute p-1 ${editMode ? 'cursor-move' : ''}`}
          style={widgetStyle(widget)}
        >
          <div className="relative h-full">
            {editMode && (
              <button
                onClick={() => onRemoveWidget(widget)}
                className="bg-destructive text-destructive-foreground absolute -right-1 -top-1 z-10 flex size-5 items-center justify-center rounded-full shadow-sm"
              >
                <X className="size-3" />
              </button>
            )}
            <WidgetRenderer widget={widget} />
          </div>
        </div>
      ))}
    </div>
  );
}

function WidgetRenderer({ widget }: { widget: DashboardWidget }) {
  if (widget.widgetType === 'KPI_CARD') {
    return <KpiCardWidget kpiSlug={widget.kpiSlug} />;
  }
  return <ChartWidget kpiSlug={widget.kpiSlug} widgetType={widget.widgetType} />;
}

// ─── Dashboard Selector ───────────────────────────────────────────────────────

function DashboardSelector({
  dashboards,
  activeDashboardId,
  onSelect,
}: {
  dashboards: Dashboard[];
  activeDashboardId: string | undefined;
  onSelect: (id: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {dashboards.map((d) => (
          <DropdownMenuItem
            key={d.id}
            onClick={() => onSelect(d.id)}
            className={d.id === activeDashboardId ? 'font-medium' : ''}
          >
            {d.name}
            {d.isDefault && <span className="text-muted-foreground ml-2 text-xs">(defecto)</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Add Widget Dialog ────────────────────────────────────────────────────────

const WIDGET_ICONS: Record<string, React.ElementType> = {
  'users.total': Users,
  'users.active': Users,
  'roles.total': Shield,
  'files.total': Files,
  'blog.posts.published': Newspaper,
  'blog.posts.draft': Newspaper,
};

function AddWidgetDialog({
  open,
  onClose,
  dashboardId,
  existingSlugs,
  nextY,
}: {
  open: boolean;
  onClose: () => void;
  dashboardId: string;
  existingSlugs: string[];
  nextY: number;
}) {
  const { data: catalog } = useKpiCatalog();
  const addWidget = useAddWidget();
  const [selectedType, setSelectedType] = useState<WidgetType>('KPI_CARD');

  const available = (catalog?.kpis ?? []).filter((k) => !existingSlugs.includes(k.slug));

  function handleAdd(slug: string) {
    const isCard = selectedType === 'KPI_CARD';
    addWidget.mutate(
      {
        dashboardId,
        kpiSlug: slug,
        widgetType: selectedType,
        x: 0,
        y: nextY,
        w: isCard ? 3 : 12,
        h: isCard ? 2 : 4,
      },
      {
        onSuccess: () => {
          toast.success('Widget añadido');
          onClose();
        },
        onError: () => toast.error('No se pudo añadir el widget'),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Añadir widget</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['KPI_CARD', 'LINE', 'BAR'] as WidgetType[]).map((t) => (
              <Button
                key={t}
                variant={selectedType === t ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(t)}
              >
                {t === 'KPI_CARD' ? 'Tarjeta' : t === 'LINE' ? 'Línea' : 'Barras'}
              </Button>
            ))}
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {available.length === 0 && (
              <p className="text-muted-foreground py-4 text-center text-sm">
                No hay KPIs disponibles para añadir.
              </p>
            )}
            {available.map((kpi) => {
              const Icon = WIDGET_ICONS[kpi.slug] ?? Files;
              return (
                <button
                  key={kpi.slug}
                  onClick={() => handleAdd(kpi.slug)}
                  disabled={addWidget.isPending}
                  className="hover:bg-accent flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
                >
                  <Icon className="text-muted-foreground size-4 shrink-0" />
                  <span className="text-left">{kpi.label}</span>
                  <span className="text-muted-foreground ml-auto text-xs">{kpi.slug}</span>
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Dashboard Dialog ──────────────────────────────────────────────────

function CreateDashboardDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const create = useCreateDashboard();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim() },
      {
        onSuccess: (d: Dashboard) => {
          toast.success('Dashboard creado');
          onCreated(d.id);
          setName('');
          onClose();
        },
        onError: () => toast.error('No se pudo crear el dashboard'),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nuevo dashboard</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Nombre del dashboard"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim() || create.isPending}>
              Crear
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Rename Dashboard Dialog ──────────────────────────────────────────────────

function RenameDashboardDialog({
  open,
  onClose,
  dashboard,
}: {
  open: boolean;
  onClose: () => void;
  dashboard: Dashboard;
}) {
  const [name, setName] = useState(dashboard.name);
  const update = useUpdateDashboard();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    update.mutate(
      { id: dashboard.id, name: name.trim() },
      {
        onSuccess: () => {
          toast.success('Dashboard renombrado');
          onClose();
        },
        onError: () => toast.error('No se pudo renombrar'),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Renombrar dashboard</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim() || update.isPending}>
              Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function DashboardPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-24" />
      </div>
      <DashboardGridSkeleton />
    </div>
  );
}

function DashboardGridSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className={`h-24 ${i === 4 ? 'col-span-4' : ''}`} />
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function widgetStyle(w: DashboardWidget): React.CSSProperties {
  const colW = 100 / GRID_COLS;
  return {
    left: `${w.x * colW}%`,
    top: `${w.y * ROW_H}px`,
    width: `${w.w * colW}%`,
    height: `${w.h * ROW_H}px`,
  };
}

function widgetToLayout(w: DashboardWidget): LayoutWidget {
  return {
    id: w.id,
    kpiSlug: w.kpiSlug,
    widgetType: w.widgetType,
    x: w.x,
    y: w.y,
    w: w.w,
    h: w.h,
    order: w.order,
    config: w.config,
  };
}

function nextY(widgets: DashboardWidget[]): number {
  if (widgets.length === 0) return 0;
  return Math.max(...widgets.map((w) => w.y + w.h));
}
