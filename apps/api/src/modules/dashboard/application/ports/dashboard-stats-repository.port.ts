import { type DashboardStats } from '../dto/dashboard-stats';

export const DASHBOARD_STATS_REPOSITORY = 'DASHBOARD_STATS_REPOSITORY';

/**
 * Puerto de lectura de métricas agregadas. El adapter cuenta sobre las tablas
 * existentes de los distintos bounded contexts (IAM, blog, storage); no hay
 * tabla propia del dashboard.
 */
export interface DashboardStatsRepositoryPort {
  getStats(): Promise<DashboardStats>;
}
