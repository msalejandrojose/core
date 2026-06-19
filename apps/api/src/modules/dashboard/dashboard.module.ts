import { Module } from '@nestjs/common';
import { DASHBOARD_STATS_REPOSITORY } from './application/ports/dashboard-stats-repository.port';
import { GetDashboardStatsUseCase } from './application/use-cases/get-dashboard-stats.use-case';
import { DashboardController } from './infrastructure/http/dashboard.controller';
import { PrismaDashboardStatsRepository } from './infrastructure/persistence/prisma-dashboard-stats.repository';

/**
 * Módulo de solo lectura que expone métricas agregadas. No tiene persistencia
 * propia: el adapter cuenta sobre las tablas de los demás contextos vía el
 * `PrismaService` global.
 */
@Module({
  controllers: [DashboardController],
  providers: [
    GetDashboardStatsUseCase,
    {
      provide: DASHBOARD_STATS_REPOSITORY,
      useClass: PrismaDashboardStatsRepository,
    },
  ],
})
export class DashboardModule {}
