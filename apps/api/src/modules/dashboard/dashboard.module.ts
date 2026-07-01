import { Module } from '@nestjs/common';
import { KpiRegistry } from './application/kpi-registry.service';
import { DASHBOARD_STATS_REPOSITORY } from './application/ports/dashboard-stats-repository.port';
import { DASHBOARD_REPOSITORY } from './application/ports/dashboard-repository.port';
import { AddWidgetUseCase } from './application/use-cases/add-widget.use-case';
import { DuplicateDashboardUseCase } from './application/use-cases/duplicate-dashboard.use-case';
import { CreateDashboardUseCase } from './application/use-cases/create-dashboard.use-case';
import { DeleteDashboardUseCase } from './application/use-cases/delete-dashboard.use-case';
import { GetDashboardStatsUseCase } from './application/use-cases/get-dashboard-stats.use-case';
import { GetDashboardSummaryUseCase } from './application/use-cases/get-dashboard-summary.use-case';
import { GetDashboardUseCase } from './application/use-cases/get-dashboard.use-case';
import { ListDashboardsUseCase } from './application/use-cases/list-dashboards.use-case';
import { RemoveWidgetUseCase } from './application/use-cases/remove-widget.use-case';
import { SaveLayoutUseCase } from './application/use-cases/save-layout.use-case';
import { UpdateDashboardUseCase } from './application/use-cases/update-dashboard.use-case';
import { DashboardController } from './infrastructure/http/dashboard.controller';
import { DashboardsController } from './infrastructure/http/dashboards.controller';
import { ComputedKpiBuiltinsService } from './infrastructure/persistence/computed-kpi-builtins.service';
import { KpiBuiltinsService } from './infrastructure/persistence/kpi-builtins.service';
import { PrismaDashboardRepository } from './infrastructure/persistence/prisma-dashboard.repository';
import { PrismaDashboardStatsRepository } from './infrastructure/persistence/prisma-dashboard-stats.repository';

@Module({
  controllers: [DashboardController, DashboardsController],
  providers: [
    // KPI infrastructure
    GetDashboardStatsUseCase,
    GetDashboardSummaryUseCase,
    KpiRegistry,
    KpiBuiltinsService,
    ComputedKpiBuiltinsService,
    {
      provide: DASHBOARD_STATS_REPOSITORY,
      useClass: PrismaDashboardStatsRepository,
    },
    // Dashboard CRUD
    {
      provide: DASHBOARD_REPOSITORY,
      useClass: PrismaDashboardRepository,
    },
    ListDashboardsUseCase,
    GetDashboardUseCase,
    CreateDashboardUseCase,
    UpdateDashboardUseCase,
    DeleteDashboardUseCase,
    DuplicateDashboardUseCase,
    SaveLayoutUseCase,
    AddWidgetUseCase,
    RemoveWidgetUseCase,
  ],
})
export class DashboardModule {}
