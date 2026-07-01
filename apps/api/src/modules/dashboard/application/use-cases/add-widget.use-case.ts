import { Inject, Injectable } from '@nestjs/common';
import type { DashboardWidget, WidgetType } from '../../domain/entities/dashboard.entity';
import { DashboardForbiddenError, DashboardNotFoundError } from '../../domain/errors/dashboard.errors';
import {
  DASHBOARD_REPOSITORY,
  type DashboardRepositoryPort,
} from '../ports/dashboard-repository.port';

export interface AddWidgetInput {
  dashboardId: string;
  userId: string;
  kpiSlug: string;
  widgetType: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  config?: Record<string, unknown> | null;
}

@Injectable()
export class AddWidgetUseCase {
  constructor(@Inject(DASHBOARD_REPOSITORY) private readonly repo: DashboardRepositoryPort) {}

  async execute(input: AddWidgetInput): Promise<DashboardWidget> {
    const dashboard = await this.repo.findById(input.dashboardId);
    if (!dashboard) throw new DashboardNotFoundError(input.dashboardId);
    if (dashboard.userId !== input.userId) throw new DashboardForbiddenError();

    const order = dashboard.widgets.length;
    return this.repo.addWidget(input.dashboardId, {
      kpiSlug: input.kpiSlug,
      widgetType: input.widgetType,
      x: input.x,
      y: input.y,
      w: input.w,
      h: input.h,
      config: input.config ?? null,
      order,
    });
  }
}
