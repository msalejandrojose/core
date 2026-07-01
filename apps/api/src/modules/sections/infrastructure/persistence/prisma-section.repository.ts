import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  RoleSectionAccessRecord,
  Section,
  SectionAccessType,
  SectionScope,
  UserSectionAccessRecord,
} from '../../domain/entities/section.entity';
import {
  ListSectionsOptions,
  SectionRepositoryPort,
  UpdateSectionPatch,
} from '../../application/ports/section-repository.port';
import { toDomain } from './section.mapper';

@Injectable()
export class PrismaSectionRepository implements SectionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAllActiveByScope(scope: SectionScope): Promise<Section[]> {
    const scopes = scope === 'SHARED' ? ['SHARED'] : [scope, 'SHARED'];
    const rows = await this.prisma.section.findMany({
      where: { isActive: true, scope: { in: scopes as SectionScope[] } },
      orderBy: [{ order: 'asc' }],
    });
    return rows.map(toDomain);
  }

  async findAll(): Promise<Section[]> {
    const rows = await this.prisma.section.findMany({ orderBy: [{ order: 'asc' }] });
    return rows.map(toDomain);
  }

  async findById(id: string): Promise<Section | null> {
    const row = await this.prisma.section.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByCodeAndScope(code: string, scope: SectionScope): Promise<Section | null> {
    const row = await this.prisma.section.findUnique({ where: { code_scope: { code, scope } } });
    return row ? toDomain(row) : null;
  }

  async hasActiveChildren(id: string): Promise<boolean> {
    const count = await this.prisma.section.count({
      where: { parentId: id, isActive: true },
    });
    return count > 0;
  }

  async list(opts: ListSectionsOptions): Promise<{ items: Section[]; total: number }> {
    const where = {
      ...(opts.scope !== undefined && { scope: opts.scope }),
      ...(opts.isActive !== undefined && { isActive: opts.isActive }),
      ...(opts.codeContains !== undefined && { code: { contains: opts.codeContains } }),
      ...(opts.nameContains !== undefined && { name: { contains: opts.nameContains } }),
    };

    const allowedSortFields: Record<string, boolean> = {
      code: true,
      name: true,
      scope: true,
      order: true,
      createdAt: true,
    };
    const sortField = opts.sort && allowedSortFields[opts.sort] ? opts.sort : 'order';

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.section.findMany({
        where,
        orderBy: [{ [sortField]: opts.order }],
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      this.prisma.section.count({ where }),
    ]);

    return { items: rows.map(toDomain), total };
  }

  async create(section: Section): Promise<Section> {
    const row = await this.prisma.section.create({
      data: {
        id: section.id,
        code: section.code,
        name: section.name,
        icon: section.icon,
        route: section.route,
        parentId: section.parentId,
        scope: section.scope,
        order: section.order,
        isActive: section.isActive,
        apiRequirements: section.apiRequirements,
      },
    });
    return toDomain(row);
  }

  async update(id: string, patch: UpdateSectionPatch): Promise<Section> {
    const row = await this.prisma.section.update({
      where: { id },
      data: {
        ...(patch.code !== undefined && { code: patch.code }),
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.icon !== undefined && { icon: patch.icon }),
        ...(patch.route !== undefined && { route: patch.route }),
        ...(patch.parentId !== undefined && { parentId: patch.parentId }),
        ...(patch.scope !== undefined && { scope: patch.scope }),
        ...(patch.order !== undefined && { order: patch.order }),
        ...(patch.isActive !== undefined && { isActive: patch.isActive }),
        ...(patch.apiRequirements !== undefined && {
          apiRequirements: patch.apiRequirements,
        }),
      },
    });
    return toDomain(row);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.section.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async findRoleAccess(userRoleIds: string[]): Promise<RoleSectionAccessRecord[]> {
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

  async findAccessBySectionId(
    sectionId: string,
  ): Promise<{ roleAccess: RoleSectionAccessRecord[]; userAccess: UserSectionAccessRecord[] }> {
    const [roleAccess, userAccess] = await Promise.all([
      this.prisma.roleSectionAccess.findMany({
        where: { sectionId },
        select: { userRoleId: true, sectionId: true, access: true },
      }),
      this.prisma.userSectionAccess.findMany({
        where: { sectionId },
        select: { userId: true, sectionId: true, access: true },
      }),
    ]);
    return { roleAccess, userAccess };
  }

  async setRoleAccess(
    sectionId: string,
    roleId: string,
    access: SectionAccessType,
  ): Promise<void> {
    await this.prisma.roleSectionAccess.upsert({
      where: { userRoleId_sectionId: { userRoleId: roleId, sectionId } },
      create: { userRoleId: roleId, sectionId, access },
      update: { access },
    });
  }

  async revokeRoleAccess(sectionId: string, roleId: string): Promise<void> {
    await this.prisma.roleSectionAccess
      .delete({ where: { userRoleId_sectionId: { userRoleId: roleId, sectionId } } })
      .catch(() => {
        // Idempotente: no falla si el registro no existía
      });
  }

  async setUserAccess(
    sectionId: string,
    userId: string,
    access: SectionAccessType,
  ): Promise<void> {
    await this.prisma.userSectionAccess.upsert({
      where: { userId_sectionId: { userId, sectionId } },
      create: { userId, sectionId, access },
      update: { access },
    });
  }

  async revokeUserAccess(sectionId: string, userId: string): Promise<void> {
    await this.prisma.userSectionAccess
      .delete({ where: { userId_sectionId: { userId, sectionId } } })
      .catch(() => {
        // Idempotente: no falla si el registro no existía
      });
  }

  async roleExistsById(id: string): Promise<boolean> {
    const count = await this.prisma.userRole.count({ where: { id } });
    return count > 0;
  }

  async userExistsById(id: string): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { id } });
    return count > 0;
  }
}
