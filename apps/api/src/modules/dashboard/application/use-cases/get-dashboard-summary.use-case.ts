import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

export interface KpiItem {
  slug: string;
  label: string;
  value: number;
  unit?: 'count' | 'bytes' | 'percent';
  format?: 'integer' | 'decimal';
}

export interface DashboardSummary {
  kpis: KpiItem[];
}

@Injectable()
export class GetDashboardSummaryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<DashboardSummary> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [usersTotal, usersActive, rolesTotal, filesTotal, postsPublished, postsDraft] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { lastLoginAt: { gte: thirtyDaysAgo } } }),
        this.prisma.userRole.count(),
        this.prisma.storedFile.count(),
        this.prisma.post.count({ where: { status: 'PUBLISHED' } }),
        this.prisma.post.count({ where: { status: 'DRAFT' } }),
      ]);

    return {
      kpis: [
        { slug: 'users.total', label: 'Usuarios totales', value: usersTotal, unit: 'count', format: 'integer' },
        { slug: 'users.active', label: 'Usuarios activos (últimos 30 d)', value: usersActive, unit: 'count', format: 'integer' },
        { slug: 'roles.total', label: 'Roles', value: rolesTotal, unit: 'count', format: 'integer' },
        { slug: 'files.total', label: 'Archivos almacenados', value: filesTotal, unit: 'count', format: 'integer' },
        { slug: 'blog.posts.published', label: 'Posts publicados', value: postsPublished, unit: 'count', format: 'integer' },
        { slug: 'blog.posts.draft', label: 'Posts en borrador', value: postsDraft, unit: 'count', format: 'integer' },
      ],
    };
  }
}
