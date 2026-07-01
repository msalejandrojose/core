import {
  ChevronDown,
  Copy,
  Edit2,
  LayoutTemplate,
  Plus,
  Settings,
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
import { GaugeWidget } from './components/GaugeWidget';
import { KpiCardWidget } from './components/KpiCardWidget';
import { KpiGalleryDialog } from './components/KpiGalleryDialog';
import { WidgetConfigSheet } from './components/WidgetConfigSheet';
import { parseConfig, type WidgetConfig } from './components/widget-config';
import {
  useCreateDashboard,
  useCreateFromTemplate,
  useDashboard,
  useDashboards,
  useDeleteDashboard,
  useDashboardTemplates,
  useDuplicateDashboard,
  useRemoveWidget,
  useSaveLayout,
  useUpdateDashboard,
  type Dashboard,
  type DashboardWidget,
  type LayoutWidget,
} from './hooks/use-dashboards';

const GRID_COLS = 12;
const ROW_H = 100;

// ─── Root ─────────────────────────────────────────────────────────────────────

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

// ─── Inner component ──────────────────────────────────────────────────────────

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
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [configWidget, setConfigWidget] = useState<DashboardWidget | null>(null);

  const saveLayout = useSaveLayout();
  const removeWidget = useRemoveWidget();
  const deleteDashboard = useDeleteDashboard();
  const duplicateDashboard = useDuplicateDashboard();

  function handleRemoveWidget(widget: DashboardWidget) {
    if (!dashboard) return;
    removeWidget.mutate(
      { dashboardId: dashboard.id, widgetId: widget.id },
      { onError: () => toast.error('No se pudo eliminar el widget') },
    );
  }

  function handleSaveLayout() {
    if (!dashboard) return;
    saveLayout.mutate(
      { dashboardId: dashboard.id, widgets: dashboard.widgets.map(widgetToLayout) },
      {
        onSuccess: () => { toast.success('Layout guardado'); setEditMode(false); },
        onError: () => toast.error('No se pudo guardar el layout'),
      },
    );
  }

  function handleWidgetConfigSave(widgetId: string, config: WidgetConfig) {
    if (!dashboard) return;
    const updated: LayoutWidget[] = dashboard.widgets.map((w) =>
      w.id === widgetId ? { ...widgetToLayout(w), config: config as Record<string, unknown> } : widgetToLayout(w),
    );
    saveLayout.mutate(
      { dashboardId: dashboard.id, widgets: updated },
      {
        onSuccess: () => toast.success('Widget configurado'),
        onError: () => toast.error('No se pudo guardar la configuración'),
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

  function handleDuplicate() {
    if (!dashboard) return;
    duplicateDashboard.mutate(dashboard.id, {
      onSuccess: (d: Dashboard) => {
        toast.success('Dashboard duplicado');
        onSelectDashboard(d.id);
      },
      onError: () => toast.error('No se pudo duplicar'),
    });
  }

  const activeDashboard = dashboards.find((d) => d.id === activeDashboardId) ?? dashboards[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <PageHeader title={activeDashboard?.name ?? 'Dashboard'} />
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
              <Button variant="outline" size="sm" onClick={() => setGalleryOpen(true)}>
                <Plus className="size-4" />
                Añadir widget
              </Button>
              <Button size="sm" onClick={handleSaveLayout} disabled={saveLayout.isPending}>
                Guardar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>
                Cancelar
              </Button>
            </>
          )}
          {!editMode && (
            <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
              <Edit2 className="size-4" />
              Editar
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 size-4" /> Nuevo dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTemplatesOpen(true)}>
                <LayoutTemplate className="mr-2 size-4" /> Desde plantilla
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate} disabled={!dashboard}>
                <Copy className="mr-2 size-4" /> Duplicar dashboard
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setRenameOpen(true)} disabled={!dashboard}>
                Renombrar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleDeleteDashboard}
                disabled={dashboards.length <= 1 || !dashboard}
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
          onConfigWidget={setConfigWidget}
        />
      )}

      {/* Dialogs */}
      {dashboard && (
        <KpiGalleryDialog
          open={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          dashboardId={dashboard.id}
          existingSlugs={dashboard.widgets.map((w) => w.kpiSlug)}
          nextY={nextY(dashboard.widgets)}
        />
      )}

      <WidgetConfigSheet
        widget={configWidget}
        onClose={() => setConfigWidget(null)}
        onSave={handleWidgetConfigSave}
      />

      <CreateDashboardDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={onSelectDashboard}
      />

      <TemplatesDialog
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        onCreated={onSelectDashboard}
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
  onConfigWidget: (widget: DashboardWidget) => void;
}

function DashboardGrid({ dashboard, editMode, onRemoveWidget, onConfigWidget }: DashboardGridProps) {
  if (dashboard.widgets.length === 0) {
    return (
      <div className="text-muted-foreground flex h-48 items-center justify-center rounded-lg border border-dashed text-sm">
        No hay widgets. Activa el modo edición para añadir.
      </div>
    );
  }

  const maxRow = Math.max(...dashboard.widgets.map((w) => w.y + w.h));

  return (
    <div className="relative" style={{ height: maxRow * ROW_H }}>
      {editMode && (
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage: `repeating-linear-gradient(to right, var(--color-border) 0, var(--color-border) 1px, transparent 1px, transparent ${100 / GRID_COLS}%)`,
          }}
        />
      )}
      {dashboard.widgets.map((widget) => (
        <div key={widget.id} className="absolute p-1" style={widgetStyle(widget)}>
          <div className="relative h-full">
            {editMode && (
              <>
                <button
                  onClick={() => onRemoveWidget(widget)}
                  className="bg-destructive text-destructive-foreground absolute -right-1 -top-1 z-20 flex size-5 items-center justify-center rounded-full shadow-sm"
                  title="Eliminar widget"
                >
                  <X className="size-3" />
                </button>
                <button
                  onClick={() => onConfigWidget(widget)}
                  className="bg-background text-muted-foreground border-border absolute -left-1 -top-1 z-20 flex size-5 items-center justify-center rounded-full border shadow-sm"
                  title="Configurar widget"
                >
                  <Settings className="size-3" />
                </button>
              </>
            )}
            <WidgetRenderer widget={widget} />
          </div>
        </div>
      ))}
    </div>
  );
}

function WidgetRenderer({ widget }: { widget: DashboardWidget }) {
  const config = parseConfig(widget.config);
  if (widget.widgetType === 'KPI_CARD') {
    return <KpiCardWidget kpiSlug={widget.kpiSlug} config={config} />;
  }
  if (widget.widgetType === 'GAUGE') {
    return <GaugeWidget kpiSlug={widget.kpiSlug} config={config} />;
  }
  return <ChartWidget kpiSlug={widget.kpiSlug} widgetType={widget.widgetType} config={config} />;
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
        <Button variant="ghost" size="sm" className="text-muted-foreground h-7 px-2">
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
            {d.isDefault && (
              <span className="text-muted-foreground ml-2 text-xs">(defecto)</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Templates Dialog ─────────────────────────────────────────────────────────

function TemplatesDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { data } = useDashboardTemplates();
  const createFromTemplate = useCreateFromTemplate();
  const templates = data?.templates ?? [];

  function handleSelect(templateId: string) {
    createFromTemplate.mutate(templateId, {
      onSuccess: (d: Dashboard) => {
        toast.success('Dashboard creado desde plantilla');
        onCreated(d.id);
        onClose();
      },
      onError: () => toast.error('No se pudo crear el dashboard'),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Plantillas</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSelect(t.id)}
              disabled={createFromTemplate.isPending}
              className="hover:bg-accent w-full rounded-lg border p-3 text-left transition-colors"
            >
              <p className="font-medium">{t.name}</p>
              <p className="text-muted-foreground text-sm">{t.description}</p>
            </button>
          ))}
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

// ─── Rename Dialog ────────────────────────────────────────────────────────────

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
        onSuccess: () => { toast.success('Dashboard renombrado'); onClose(); },
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
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
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
