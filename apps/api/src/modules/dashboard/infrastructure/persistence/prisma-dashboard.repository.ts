import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { Dashboard, type DashboardWidget } from '../../domain/entities/dashboard.entity';
import type {
  AddWidgetData,
  CreateDashboardData,
  DashboardRepositoryPort,
  LayoutWidgetInput,
  UpdateDashboardPatch,
} from '../../application/ports/dashboard-repository.port';

@Injectable()
export class PrismaDashboardRepository implements DashboardRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUser(userId: string): Promise<Dashboard[]> {
    const rows = await (this.prisma as any).dashboard.findMany({
      where: { userId },
      include: { widgets: { orderBy: { order: 'asc' } } },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    return rows.map(toDomain);
  }

  async findById(id: string): Promise<Dashboard | null> {
    const row = await (this.prisma as any).dashboard.findUnique({
      where: { id },
      include: { widgets: { orderBy: { order: 'asc' } } },
    });
    return row ? toDomain(row) : null;
  }

  async findDefaultByUser(userId: string): Promise<Dashboard | null> {
    const row = await (this.prisma as any).dashboard.findFirst({
      where: { userId, isDefault: true },
      include: { widgets: { orderBy: { order: 'asc' } } },
    });
    return row ? toDomain(row) : null;
  }

  async countByUser(userId: string): Promise<number> {
    return (this.prisma as any).dashboard.count({ where: { userId } });
  }

  async create(data: CreateDashboardData): Promise<Dashboard> {
    const { createId } = await import('@paralleldrive/cuid2');
    const row = await (this.prisma as any).dashboard.create({
      data: {
        id: createId(),
        userId: data.userId,
        name: data.name,
        isDefault: data.isDefault ?? false,
      },
      include: { widgets: true },
    });
    return toDomain(row);
  }

  async update(id: string, patch: UpdateDashboardPatch): Promise<Dashboard> {
    const row = await (this.prisma as any).dashboard.update({
      where: { id },
      data: {
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.isDefault !== undefined && { isDefault: patch.isDefault }),
      },
      include: { widgets: { orderBy: { order: 'asc' } } },
    });
    return toDomain(row);
  }

  async clearDefaultForUser(userId: string): Promise<void> {
    await (this.prisma as any).dashboard.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  async delete(id: string): Promise<void> {
    await (this.prisma as any).dashboard.delete({ where: { id } });
  }

  async saveLayout(dashboardId: string, widgets: LayoutWidgetInput[]): Promise<Dashboard> {
    const { createId } = await import('@paralleldrive/cuid2');

    await (this.prisma as any).$transaction([
      (this.prisma as any).dashboardWidget.deleteMany({ where: { dashboardId } }),
      (this.prisma as any).dashboardWidget.createMany({
        data: widgets.map((w, i) => ({
          id: createId(),
          dashboardId,
          kpiSlug: w.kpiSlug,
          widgetType: w.widgetType,
          x: w.x,
          y: w.y,
          w: w.w,
          h: w.h,
          config: w.config ?? undefined,
          order: w.order ?? i,
        })),
      }),
    ]);

    const row = await (this.prisma as any).dashboard.findUniqueOrThrow({
      where: { id: dashboardId },
      include: { widgets: { orderBy: { order: 'asc' } } },
    });
    return toDomain(row);
  }

  async addWidget(dashboardId: string, data: AddWidgetData): Promise<DashboardWidget> {
    const { createId } = await import('@paralleldrive/cuid2');
    const row = await (this.prisma as any).dashboardWidget.create({
      data: {
        id: createId(),
        dashboardId,
        kpiSlug: data.kpiSlug,
        widgetType: data.widgetType,
        x: data.x,
        y: data.y,
        w: data.w,
        h: data.h,
        config: data.config ?? undefined,
        order: data.order ?? 0,
      },
    });
    return toWidgetDomain(row);
  }

  async removeWidget(widgetId: string): Promise<void> {
    await (this.prisma as any).dashboardWidget.delete({ where: { id: widgetId } });
  }
}

function toDomain(row: any): Dashboard {
  return new Dashboard(
    row.id,
    row.userId,
    row.name,
    row.isDefault,
    (row.widgets ?? []).map(toWidgetDomain),
    row.createdAt,
    row.updatedAt,
  );
}

function toWidgetDomain(w: any): DashboardWidget {
  return {
    id: w.id,
    dashboardId: w.dashboardId,
    kpiSlug: w.kpiSlug,
    widgetType: w.widgetType,
    x: w.x,
    y: w.y,
    w: w.w,
    h: w.h,
    config: w.config ?? null,
    order: w.order,
  };
}
