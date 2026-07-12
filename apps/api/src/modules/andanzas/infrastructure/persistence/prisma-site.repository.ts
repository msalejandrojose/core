import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CursorCodec, CursorPage } from '../../../../shared/pagination';
import { SiteWithTags } from '../../domain/entities/site.entity';
import {
  CreateSiteData,
  ListSitesOptions,
  SiteRepositoryPort,
} from '../../application/ports/site-repository.port';
import { SiteMapper, SiteRowWithTags } from '../mappers/site.mapper';

const SITE_INCLUDE = {
  tags: { include: { tag: true } },
} satisfies Prisma.SiteInclude;

@Injectable()
export class PrismaSiteRepository implements SiteRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSiteData): Promise<SiteWithTags> {
    const row = await this.prisma.site.create({
      data: {
        id: randomUUID(),
        name: data.name,
        category: data.category,
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address,
        externalPlaceId: data.externalPlaceId,
        createdByUserId: data.createdByUserId,
        tags: { create: data.tagIds.map((tagId) => ({ tagId })) },
      },
      include: SITE_INCLUDE,
    });
    return SiteMapper.toDomain(row as SiteRowWithTags);
  }

  async findById(id: string): Promise<SiteWithTags | null> {
    const row = await this.prisma.site.findUnique({
      where: { id },
      include: SITE_INCLUDE,
    });
    return row ? SiteMapper.toDomain(row as SiteRowWithTags) : null;
  }

  async findByExternalPlaceId(externalPlaceId: string): Promise<SiteWithTags | null> {
    const row = await this.prisma.site.findUnique({
      where: { externalPlaceId },
      include: SITE_INCLUDE,
    });
    return row ? SiteMapper.toDomain(row as SiteRowWithTags) : null;
  }

  async list(opts: ListSitesOptions): Promise<CursorPage<SiteWithTags>> {
    const filters: Prisma.SiteWhereInput = {
      ...(opts.category ? { category: opts.category } : {}),
      ...(opts.nameContains ? { name: { contains: opts.nameContains } } : {}),
    };

    // Cursor sobre createdAt DESC, id ASC (estable bajo inserciones).
    const where: Prisma.SiteWhereInput = opts.cursor
      ? { AND: [filters, this.createdAtCursorWhere(opts.cursor)] }
      : filters;

    const rows = await this.prisma.site.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: opts.limit + 1,
      include: SITE_INCLUDE,
    });

    const hasMore = rows.length > opts.limit;
    const slice = hasMore ? rows.slice(0, opts.limit) : rows;
    const last = hasMore ? slice[slice.length - 1] : null;

    return {
      items: slice.map((row) => SiteMapper.toDomain(row as SiteRowWithTags)),
      nextCursor: last
        ? CursorCodec.encode({ id: last.id, createdAt: last.createdAt.toISOString() })
        : null,
    };
  }

  private createdAtCursorWhere(cursor: string): Prisma.SiteWhereInput {
    const decoded = CursorCodec.decode(cursor);
    const date = new Date(decoded.createdAt);
    return {
      OR: [
        { createdAt: { lt: date } },
        { createdAt: date, id: { gt: decoded.id } },
      ],
    };
  }
}
