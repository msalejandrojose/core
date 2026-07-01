import { Inject, Injectable } from '@nestjs/common';
import { DashboardForbiddenError, DashboardNotFoundError } from '../../domain/errors/dashboard.errors';
import {
  DASHBOARD_REPOSITORY,
  type DashboardRepositoryPort,
} from '../ports/dashboard-repository.port';

@Injectable()
export class RemoveWidgetUseCase {
  constructor(@Inject(DASHBOARD_REPOSITORY) private readonly repo: DashboardRepositoryPort) {}

  async execute(dashboardId: string, widgetId: string, userId: string): Promise<void> {
    const dashboard = await this.repo.findById(dashboardId);
    if (!dashboard) throw new DashboardNotFoundError(dashboardId);
    if (dashboard.userId !== userId) throw new DashboardForbiddenError();

    const widgetExists = dashboard.widgets.some((w) => w.id === widgetId);
    if (!widgetExists) throw new DashboardNotFoundError(widgetId);

    await this.repo.removeWidget(widgetId);
  }
}
