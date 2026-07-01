import { Module } from '@nestjs/common';
import { KpiRegistry } from './application/kpi-registry.service';
import { DASHBOARD_STATS_REPOSITORY } from './application/ports/dashboard-stats-repository.port';
import { GetDashboardStatsUseCase } from './application/use-cases/get-dashboard-stats.use-case';
import { GetDashboardSummaryUseCase } from './application/use-cases/get-dashboard-summary.use-case';
import { DashboardController } from './infrastructure/http/dashboard.controller';
import { ComputedKpiBuiltinsService } from './infrastructure/persistence/computed-kpi-builtins.service';
import { KpiBuiltinsService } from './infrastructure/persistence/kpi-builtins.service';
import { PrismaDashboardStatsRepository } from './infrastructure/persistence/prisma-dashboard-stats.repository';

@Module({
  controllers: [DashboardController],
  providers: [
    GetDashboardStatsUseCase,
    GetDashboardSummaryUseCase,
    KpiRegistry,
    KpiBuiltinsService,
    ComputedKpiBuiltinsService,
    {
      provide: DASHBOARD_STATS_REPOSITORY,
      useClass: PrismaDashboardStatsRepository,
    },
  ],
})
export class DashboardModule {}
