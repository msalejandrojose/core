import { Inject, Injectable } from '@nestjs/common';
import type { Dashboard, DashboardWidget, WidgetType } from '../../domain/entities/dashboard.entity';
import {
  DASHBOARD_REPOSITORY,
  type DashboardRepositoryPort,
  type LayoutWidgetInput,
} from '../ports/dashboard-repository.port';

export interface CreateDashboardInput {
  userId: string;
  name: string;
  makeDefault?: boolean;
}

const DEFAULT_WIDGETS: Omit<LayoutWidgetInput, 'id'>[] = [
  { kpiSlug: 'users.total', widgetType: 'KPI_CARD', x: 0, y: 0, w: 3, h: 2, order: 0 },
  { kpiSlug: 'users.active', widgetType: 'KPI_CARD', x: 3, y: 0, w: 3, h: 2, order: 1 },
  { kpiSlug: 'roles.total', widgetType: 'KPI_CARD', x: 6, y: 0, w: 3, h: 2, order: 2 },
  { kpiSlug: 'blog.posts.published', widgetType: 'KPI_CARD', x: 9, y: 0, w: 3, h: 2, order: 3 },
  { kpiSlug: 'users.total', widgetType: 'LINE', x: 0, y: 2, w: 12, h: 4, order: 4 },
];

@Injectable()
export class CreateDashboardUseCase {
  constructor(@Inject(DASHBOARD_REPOSITORY) private readonly repo: DashboardRepositoryPort) {}

  async execute(input: CreateDashboardInput): Promise<Dashboard> {
    const isFirstDashboard = (await this.repo.countByUser(input.userId)) === 0;
    const shouldBeDefault = input.makeDefault ?? isFirstDashboard;

    if (shouldBeDefault) {
      await this.repo.clearDefaultForUser(input.userId);
    }

    const dashboard = await this.repo.create({
      userId: input.userId,
      name: input.name,
      isDefault: shouldBeDefault,
    });

    if (isFirstDashboard) {
      const widgetsWithId = DEFAULT_WIDGETS.map((w, i) => ({ ...w, id: `new-${i}` }));
      return this.repo.saveLayout(dashboard.id, widgetsWithId);
    }

    return dashboard;
  }
}
