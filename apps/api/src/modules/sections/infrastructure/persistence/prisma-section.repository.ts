import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  RoleSectionAccessRecord,
  Section,
  SectionScope,
  UserSectionAccessRecord,
} from '../../domain/entities/section.entity';
import { SectionRepositoryPort } from '../../application/ports/section-repository.port';
import { toDomain } from './section.mapper';

@Injectable()
export class PrismaSectionRepository implements SectionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAllActiveByScope(scope: SectionScope): Promise<Section[]> {
    // Para una request de árbol BACKOFFICE incluimos también las secciones
    // SHARED — la convención es que `SHARED` se renderiza en cualquier app.
    const scopes = scope === 'SHARED' ? ['SHARED'] : [scope, 'SHARED'];
    const rows = await this.prisma.section.findMany({
      where: { isActive: true, scope: { in: scopes as SectionScope[] } },
      orderBy: [{ order: 'asc' }],
    });
    return rows.map(toDomain);
  }

  async findRoleAccess(
    userRoleIds: string[],
  ): Promise<RoleSectionAccessRecord[]> {
    if (userRoleIds.length === 0) return [];
    const rows = await this.prisma.roleSectionAccess.findMany({
      where: { userRoleId: { in: userRoleIds } },
      select: { userRoleId: true, sectionId: true, access: true },
    });
    return rows;
  }

  async findUserAccess(userId: string): Promise<UserSectionAccessRecord[]> {
    const rows = await this.prisma.userSectionAccess.findMany({
      where: { userId },
      select: { userId: true, sectionId: true, access: true },
    });
    return rows;
  }
}
