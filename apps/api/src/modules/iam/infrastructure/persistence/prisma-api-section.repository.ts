import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { Filter, type FindSpec, Limit, Order } from '../../../../shared/query';
import {
  filterToPrismaWhere,
  specToPrismaArgs,
} from '../../../../shared/query/prisma/from-spec';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { ApiSection } from '../../domain/entities/api-section.entity';
import {
  ApiSectionRepositoryPort,
  ListApiSectionsOptions,
  UpdateApiSectionPatch,
} from '../../application/ports/api-section-repository.port';
import { ApiSectionMapper } from './api-section.mapper';

@Injectable()
export class PrismaApiSectionRepository implements ApiSectionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ApiSection | null> {
    const row = await this.prisma.apiSection.findUnique({ where: { id } });
    return row ? ApiSectionMapper.toDomain(row) : null;
  }

  async findByCode(code: string): Promise<ApiSection | null> {
    const row = await this.prisma.apiSection.findUnique({ where: { code } });
    return row ? ApiSectionMapper.toDomain(row) : null;
  }

  // ── getRows / getRow / getCount / getDistinctValues ────────────────────

  async getRows(
    spec: FindSpec<ApiSection> = {},
  ): Promise<PaginatedResult<ApiSection>> {
    const { where, orderBy, take, skip } = specToPrismaArgs(spec);
    const [rows, total] = await Promise.all([
      this.prisma.apiSection.findMany({
        where: where as Prisma.ApiSectionWhereInput,
        orderBy: orderBy as Prisma.ApiSectionOrderByWithRelationInput[],
        take,
        skip,
      }),
      this.prisma.apiSection.count({ where: where as Prisma.ApiSectionWhereInput }),
    ]);
    return { items: rows.map(ApiSectionMapper.toDomain), total };
  }

  async getRow(spec: FindSpec<ApiSection>): Promise<ApiSection | null> {
    const { where, orderBy } = specToPrismaArgs(spec);
    const row = await this.prisma.apiSection.findFirst({
      where: where as Prisma.ApiSectionWhereInput,
      orderBy: orderBy as Prisma.ApiSectionOrderByWithRelationInput[],
    });
    return row ? ApiSectionMapper.toDomain(row) : null;
  }

  async getCount(filter?: Filter<ApiSection>): Promise<number> {
    const where = filterToPrismaWhere(filter);
    return this.prisma.apiSection.count({
      where: where as Prisma.ApiSectionWhereInput,
    });
  }

  async getDistinctValues<K extends keyof ApiSection>(
    field: K,
    filter?: Filter<ApiSection>,
  ): Promise<ApiSection[K][]> {
    const where = filterToPrismaWhere(filter);
    const rows = await this.prisma.apiSection.findMany({
      where: where as Prisma.ApiSectionWhereInput,
      distinct: [field as Prisma.ApiSectionScalarFieldEnum],
      select: { [field as string]: true } as Prisma.ApiSectionSelect,
    });
    return rows.map((r) => (r as Record<string, unknown>)[field as string]) as ApiSection[K][];
  }

  // ── Compat shim ────────────────────────────────────────────────────────

  async findMany(
    opts: ListApiSectionsOptions,
  ): Promise<PaginatedResult<ApiSection>> {
    const filter = new Filter<ApiSection>();
    if (opts.parentSectionId === null) {
      filter.addIsNull('parentSectionId');
    } else if (opts.parentSectionId !== undefined) {
      filter.addEqualValue('parentSectionId', opts.parentSectionId);
    }
    if (opts.codeContains) filter.addLike('code', `%${opts.codeContains}%`);

    const sort = (opts.sort ?? 'code') as keyof ApiSection;
    return this.getRows({
      filter,
      order: new Order<ApiSection>().add(sort, opts.order),
      limit: Limit.page(opts.page, opts.limit),
    });
  }

  // ── Mutaciones ─────────────────────────────────────────────────────────

  async create(section: ApiSection): Promise<ApiSection> {
    const row = await this.prisma.apiSection.create({
      data: ApiSectionMapper.toPersistenceCreate(section),
    });
    return ApiSectionMapper.toDomain(row);
  }

  async update(
    id: string,
    patch: UpdateApiSectionPatch,
  ): Promise<ApiSection> {
    const row = await this.prisma.apiSection.update({
      where: { id },
      data: {
        name: patch.name,
        description: patch.description,
        parentSectionId: patch.parentSectionId,
      },
    });
    return ApiSectionMapper.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.apiSection.delete({ where: { id } });
  }

  async isInUse(id: string): Promise<boolean> {
    const [childCount, rolePermCount, userPermCount] = await Promise.all([
      this.prisma.apiSection.count({ where: { parentSectionId: id } }),
      this.prisma.roleApiSectionPermission.count({ where: { apiSectionId: id } }),
      this.prisma.userApiSectionPermission.count({ where: { apiSectionId: id } }),
    ]);
    return childCount + rolePermCount + userPermCount > 0;
  }

  async findAncestorsIncludingSelf(id: string): Promise<ApiSection[]> {
    const path: ApiSection[] = [];
    const visited = new Set<string>();
    let current = await this.findById(id);
    while (current && !visited.has(current.id)) {
      path.push(current);
      visited.add(current.id);
      if (!current.parentSectionId) break;
      current = await this.findById(current.parentSectionId);
    }
    return path;
  }
}
