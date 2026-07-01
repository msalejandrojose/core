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

export class Dashboard {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly isDefault: boolean,
    public readonly widgets: DashboardWidget[],
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
