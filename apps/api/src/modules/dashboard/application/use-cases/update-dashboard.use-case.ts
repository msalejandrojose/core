import { Inject, Injectable } from '@nestjs/common';
import type { Dashboard } from '../../domain/entities/dashboard.entity';
import { DashboardForbiddenError, DashboardNotFoundError } from '../../domain/errors/dashboard.errors';
import { DASHBOARD_REPOSITORY, type DashboardRepositoryPort } from '../ports/dashboard-repository.port';

export interface UpdateDashboardInput {
  id: string;
  userId: string;
  name?: string;
  makeDefault?: boolean;
}

@Injectable()
export class UpdateDashboardUseCase {
  constructor(@Inject(DASHBOARD_REPOSITORY) private readonly repo: DashboardRepositoryPort) {}

  async execute(input: UpdateDashboardInput): Promise<Dashboard> {
    const dashboard = await this.repo.findById(input.id);
    if (!dashboard) throw new DashboardNotFoundError(input.id);
    if (dashboard.userId !== input.userId) throw new DashboardForbiddenError();

    if (input.makeDefault) {
      await this.repo.clearDefaultForUser(input.userId);
    }

    return this.repo.update(input.id, {
      name: input.name,
      isDefault: input.makeDefault,
    });
  }
}
