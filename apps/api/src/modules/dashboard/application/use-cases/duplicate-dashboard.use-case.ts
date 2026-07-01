import { Inject, Injectable } from '@nestjs/common';
import type { Dashboard } from '../../domain/entities/dashboard.entity';
import { DashboardForbiddenError, DashboardNotFoundError } from '../../domain/errors/dashboard.errors';
import { DASHBOARD_REPOSITORY, type DashboardRepositoryPort } from '../ports/dashboard-repository.port';

@Injectable()
export class DuplicateDashboardUseCase {
  constructor(@Inject(DASHBOARD_REPOSITORY) private readonly repo: DashboardRepositoryPort) {}

  async execute(id: string, userId: string): Promise<Dashboard> {
    const source = await this.repo.findById(id);
    if (!source) throw new DashboardNotFoundError(id);
    if (source.userId !== userId) throw new DashboardForbiddenError();

    const copy = await this.repo.create({
      userId,
      name: `${source.name} (copia)`,
      isDefault: false,
    });

    if (source.widgets.length > 0) {
      return this.repo.saveLayout(
        copy.id,
        source.widgets.map((w) => ({
          id: w.id,
          kpiSlug: w.kpiSlug,
          widgetType: w.widgetType,
          x: w.x,
          y: w.y,
          w: w.w,
          h: w.h,
          order: w.order,
          config: w.config ?? undefined,
        })),
      );
    }

    return copy;
  }
}
