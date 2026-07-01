import { Inject, Injectable } from '@nestjs/common';
import type { Dashboard } from '../../domain/entities/dashboard.entity';
import { DASHBOARD_REPOSITORY, type DashboardRepositoryPort } from '../ports/dashboard-repository.port';

@Injectable()
export class ListDashboardsUseCase {
  constructor(@Inject(DASHBOARD_REPOSITORY) private readonly repo: DashboardRepositoryPort) {}

  async execute(userId: string): Promise<Dashboard[]> {
    return this.repo.findAllByUser(userId);
  }
}
