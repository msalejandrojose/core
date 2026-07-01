import type { Dashboard, DashboardWidget, WidgetType } from '../../domain/entities/dashboard.entity';

export const DASHBOARD_REPOSITORY = Symbol('DASHBOARD_REPOSITORY');

export interface CreateDashboardData {
  userId: string;
  name: string;
  isDefault?: boolean;
}

export interface UpdateDashboardPatch {
  name?: string;
  isDefault?: boolean;
}

export interface AddWidgetData {
  kpiSlug: string;
  widgetType: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  config?: Record<string, unknown> | null;
  order?: number;
}

export interface LayoutWidgetInput {
  id: string;
  kpiSlug: string;
  widgetType: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  config?: Record<string, unknown> | null;
  order: number;
}

export interface DashboardRepositoryPort {
  findAllByUser(userId: string): Promise<Dashboard[]>;
  findById(id: string): Promise<Dashboard | null>;
  findDefaultByUser(userId: string): Promise<Dashboard | null>;
  countByUser(userId: string): Promise<number>;
  create(data: CreateDashboardData): Promise<Dashboard>;
  update(id: string, patch: UpdateDashboardPatch): Promise<Dashboard>;
  clearDefaultForUser(userId: string): Promise<void>;
  delete(id: string): Promise<void>;
  saveLayout(dashboardId: string, widgets: LayoutWidgetInput[]): Promise<Dashboard>;
  addWidget(dashboardId: string, data: AddWidgetData): Promise<DashboardWidget>;
  removeWidget(widgetId: string): Promise<void>;
}
