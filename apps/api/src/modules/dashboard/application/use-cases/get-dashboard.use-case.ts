import { Inject, Injectable } from '@nestjs/common';
import type { Dashboard } from '../../domain/entities/dashboard.entity';
import { DashboardForbiddenError, DashboardNotFoundError } from '../../domain/errors/dashboard.errors';
import { DASHBOARD_REPOSITORY, type DashboardRepositoryPort } from '../ports/dashboard-repository.port';

@Injectable()
export class GetDashboardUseCase {
  constructor(@Inject(DASHBOARD_REPOSITORY) private readonly repo: DashboardRepositoryPort) {}

  async execute(id: string, userId: string): Promise<Dashboard> {
    const dashboard = await this.repo.findById(id);
    if (!dashboard) throw new DashboardNotFoundError(id);
    if (dashboard.userId !== userId) throw new DashboardForbiddenError();
    return dashboard;
  }
}
