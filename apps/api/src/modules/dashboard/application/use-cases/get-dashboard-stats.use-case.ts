import { Inject, Injectable } from '@nestjs/common';
import { type DashboardStats } from '../dto/dashboard-stats';
import {
  DASHBOARD_STATS_REPOSITORY,
  type DashboardStatsRepositoryPort,
} from '../ports/dashboard-stats-repository.port';

@Injectable()
export class GetDashboardStatsUseCase {
  constructor(
    @Inject(DASHBOARD_STATS_REPOSITORY)
    private readonly repo: DashboardStatsRepositoryPort,
  ) {}

  execute(): Promise<DashboardStats> {
    return this.repo.getStats();
  }
}
