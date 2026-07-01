import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export type WidgetType = 'KPI_CARD' | 'LINE' | 'BAR' | 'AREA' | 'GAUGE';

export interface DashboardWidget {
  id: string;
  dashboardId: string;
  kpiSlug: string;
  widgetType: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  config: Record<string, unknown> | null;
  order: number;
}

export interface Dashboard {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  widgets: DashboardWidget[];
  createdAt: string;
  updatedAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = apiClient as any;

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useDashboards() {
  return useQuery<{ dashboards: Dashboard[] }>({
    queryKey: ['dashboards'],
    queryFn: async () => {
      const { data, error } = await client.GET('/dashboards');
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60,
  });
}

export function useDashboard(id: string | undefined) {
  return useQuery<Dashboard>({
    queryKey: ['dashboards', id],
    queryFn: async () => {
      const { data, error } = await client.GET('/dashboards/{id}', { params: { path: { id } } });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    staleTime: 1000 * 30,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateDashboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; makeDefault?: boolean }) => {
      const { data, error } = await client.POST('/dashboards', { body });
      if (error) throw error;
      return data as Dashboard;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboards'] }),
  });
}

export function useUpdateDashboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; name?: string; makeDefault?: boolean }) => {
      const { data, error } = await client.PATCH('/dashboards/{id}', {
        params: { path: { id } },
        body,
      });
      if (error) throw error;
      return data as Dashboard;
    },
    onSuccess: (updated: Dashboard) => {
      qc.invalidateQueries({ queryKey: ['dashboards'] });
      qc.setQueryData(['dashboards', updated.id], updated);
    },
  });
}

export function useDeleteDashboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.DELETE('/dashboards/{id}', { params: { path: { id } } });
      if (error) throw error;
    },
    onSuccess: (_: void, id: string) => {
      qc.removeQueries({ queryKey: ['dashboards', id] });
      qc.invalidateQueries({ queryKey: ['dashboards'] });
    },
  });
}

export interface LayoutWidget {
  id: string;
  kpiSlug: string;
  widgetType: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  order: number;
  config?: Record<string, unknown> | null;
}

export function useSaveLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ dashboardId, widgets }: { dashboardId: string; widgets: LayoutWidget[] }) => {
      const { data, error } = await client.PUT('/dashboards/{id}/layout', {
        params: { path: { id: dashboardId } },
        body: { widgets },
      });
      if (error) throw error;
      return data as Dashboard;
    },
    onSuccess: (updated: Dashboard) => {
      qc.setQueryData(['dashboards', updated.id], updated);
      qc.invalidateQueries({ queryKey: ['dashboards'] });
    },
  });
}

export function useAddWidget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dashboardId,
      ...body
    }: {
      dashboardId: string;
      kpiSlug: string;
      widgetType: WidgetType;
      x: number;
      y: number;
      w: number;
      h: number;
      config?: Record<string, unknown> | null;
    }) => {
      const { data, error } = await client.POST('/dashboards/{id}/widgets', {
        params: { path: { id: dashboardId } },
        body,
      });
      if (error) throw error;
      return data as DashboardWidget;
    },
    onSuccess: (_: DashboardWidget, vars: { dashboardId: string }) => {
      qc.invalidateQueries({ queryKey: ['dashboards', vars.dashboardId] });
    },
  });
}

export function useRemoveWidget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ dashboardId, widgetId }: { dashboardId: string; widgetId: string }) => {
      const { error } = await client.DELETE('/dashboards/{id}/widgets/{widgetId}', {
        params: { path: { id: dashboardId, widgetId } },
      });
      if (error) throw error;
    },
    onSuccess: (_: void, vars: { dashboardId: string }) => {
      qc.invalidateQueries({ queryKey: ['dashboards', vars.dashboardId] });
    },
  });
}

export function useDuplicateDashboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await client.POST('/dashboards/{id}/duplicate', {
        params: { path: { id } },
      });
      if (error) throw error;
      return data as Dashboard;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboards'] }),
  });
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
}

export function useDashboardTemplates() {
  return useQuery<{ templates: DashboardTemplate[] }>({
    queryKey: ['dashboards', 'templates'],
    queryFn: async () => {
      const { data, error } = await client.GET('/dashboards/templates');
      if (error) throw error;
      return data;
    },
    staleTime: Infinity,
  });
}

export function useCreateFromTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (templateId: string) => {
      const { data, error } = await client.POST('/dashboards/from-template/{templateId}', {
        params: { path: { templateId } },
      });
      if (error) throw error;
      return data as Dashboard;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboards'] }),
  });
}
