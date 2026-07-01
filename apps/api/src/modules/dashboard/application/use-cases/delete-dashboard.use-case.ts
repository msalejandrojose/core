import { Inject, Injectable } from '@nestjs/common';
import {
  CannotDeleteLastDashboardError,
  DashboardForbiddenError,
  DashboardNotFoundError,
} from '../../domain/errors/dashboard.errors';
import { DASHBOARD_REPOSITORY, type DashboardRepositoryPort } from '../ports/dashboard-repository.port';

@Injectable()
export class DeleteDashboardUseCase {
  constructor(@Inject(DASHBOARD_REPOSITORY) private readonly repo: DashboardRepositoryPort) {}

  async execute(id: string, userId: string): Promise<void> {
    const dashboard = await this.repo.findById(id);
    if (!dashboard) throw new DashboardNotFoundError(id);
    if (dashboard.userId !== userId) throw new DashboardForbiddenError();

    const count = await this.repo.countByUser(userId);
    if (count <= 1) throw new CannotDeleteLastDashboardError();

    await this.repo.delete(id);

    // If deleted the default, promote the first remaining
    if (dashboard.isDefault) {
      const remaining = await this.repo.findAllByUser(userId);
      if (remaining[0]) {
        await this.repo.update(remaining[0].id, { isDefault: true });
      }
    }
  }
}
