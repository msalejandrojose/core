import type { WidgetType } from '../domain/entities/dashboard.entity';

interface TemplateWidget {
  kpiSlug: string;
  widgetType: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  order: number;
  config?: Record<string, unknown>;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  widgets: TemplateWidget[];
}

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: 'ejecutivo',
    name: 'Ejecutivo',
    description: 'KPIs de alto nivel: usuarios, activación y publicaciones',
    widgets: [
      { kpiSlug: 'users.total', widgetType: 'KPI_CARD', x: 0, y: 0, w: 3, h: 2, order: 0 },
      { kpiSlug: 'users.active', widgetType: 'KPI_CARD', x: 3, y: 0, w: 3, h: 2, order: 1 },
      { kpiSlug: 'users.activation_rate', widgetType: 'GAUGE', x: 6, y: 0, w: 3, h: 2, order: 2 },
      { kpiSlug: 'blog.posts.published', widgetType: 'KPI_CARD', x: 9, y: 0, w: 3, h: 2, order: 3 },
      { kpiSlug: 'users.total', widgetType: 'LINE', x: 0, y: 2, w: 8, h: 4, order: 4 },
      { kpiSlug: 'blog.publish_rate', widgetType: 'GAUGE', x: 8, y: 2, w: 4, h: 4, order: 5 },
    ],
  },
  {
    id: 'operacional',
    name: 'Operacional',
    description: 'Storage, archivos y estado del blog',
    widgets: [
      { kpiSlug: 'files.total', widgetType: 'KPI_CARD', x: 0, y: 0, w: 3, h: 2, order: 0 },
      { kpiSlug: 'files.bytes_total', widgetType: 'KPI_CARD', x: 3, y: 0, w: 3, h: 2, order: 1 },
      { kpiSlug: 'storage.bytes_per_user', widgetType: 'KPI_CARD', x: 6, y: 0, w: 3, h: 2, order: 2 },
      { kpiSlug: 'blog.posts.draft', widgetType: 'KPI_CARD', x: 9, y: 0, w: 3, h: 2, order: 3 },
      { kpiSlug: 'files.total', widgetType: 'BAR', x: 0, y: 2, w: 12, h: 4, order: 4 },
    ],
  },
  {
    id: 'contenido',
    name: 'Contenido',
    description: 'KPIs del módulo blog: publicaciones, borradores y tasa de publicación',
    widgets: [
      { kpiSlug: 'blog.posts.published', widgetType: 'KPI_CARD', x: 0, y: 0, w: 4, h: 2, order: 0 },
      { kpiSlug: 'blog.posts.draft', widgetType: 'KPI_CARD', x: 4, y: 0, w: 4, h: 2, order: 1 },
      { kpiSlug: 'blog.publish_rate', widgetType: 'GAUGE', x: 8, y: 0, w: 4, h: 2, order: 2 },
      { kpiSlug: 'blog.posts.published', widgetType: 'LINE', x: 0, y: 2, w: 12, h: 4, order: 3 },
    ],
  },
];
