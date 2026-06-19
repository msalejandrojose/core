import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { type DashboardStats } from '../../application/dto/dashboard-stats';
import { type DashboardStatsRepositoryPort } from '../../application/ports/dashboard-stats-repository.port';

@Injectable()
export class PrismaDashboardStatsRepository
  implements DashboardStatsRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<DashboardStats> {
    // Todos los counts en paralelo: son consultas independientes y baratas.
    const [
      usersTotal,
      usersActive,
      rolesTotal,
      apiSectionsTotal,
      postsTotal,
      postsPublished,
      categoriesTotal,
      tagsTotal,
      filesTotal,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.userRole.count(),
      this.prisma.apiSection.count(),
      this.prisma.post.count(),
      this.prisma.post.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.postCategory.count(),
      this.prisma.postTag.count(),
      // Solo ficheros vivos: el borrado es lógico (deletedAt).
      this.prisma.storedFile.count({ where: { deletedAt: null } }),
    ]);

    return {
      users: { total: usersTotal, active: usersActive },
      roles: { total: rolesTotal },
      apiSections: { total: apiSectionsTotal },
      blog: {
        posts: postsTotal,
        published: postsPublished,
        categories: categoriesTotal,
        tags: tagsTotal,
      },
      files: { total: filesTotal },
    };
  }
}
