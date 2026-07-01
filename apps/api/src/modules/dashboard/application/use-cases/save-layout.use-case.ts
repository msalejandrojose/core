import { Inject, Injectable } from '@nestjs/common';
import type { Dashboard } from '../../domain/entities/dashboard.entity';
import { DashboardForbiddenError, DashboardNotFoundError } from '../../domain/errors/dashboard.errors';
import {
  DASHBOARD_REPOSITORY,
  type DashboardRepositoryPort,
  type LayoutWidgetInput,
} from '../ports/dashboard-repository.port';

@Injectable()
export class SaveLayoutUseCase {
  constructor(@Inject(DASHBOARD_REPOSITORY) private readonly repo: DashboardRepositoryPort) {}

  async execute(
    dashboardId: string,
    userId: string,
    widgets: LayoutWidgetInput[],
  ): Promise<Dashboard> {
    const dashboard = await this.repo.findById(dashboardId);
    if (!dashboard) throw new DashboardNotFoundError(dashboardId);
    if (dashboard.userId !== userId) throw new DashboardForbiddenError();

    return this.repo.saveLayout(dashboardId, widgets);
  }
}
