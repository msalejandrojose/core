import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CursorCodec, CursorPage } from '../../../../shared/pagination';
import {
  SiteEntry,
  SiteEntryWithSite,
} from '../../domain/entities/site-entry.entity';
import {
  ListFeedOptions,
  ListMySiteEntriesOptions,
  SiteEntryRepositoryPort,
  UpsertSiteEntryStatusData,
} from '../../application/ports/site-entry-repository.port';
import {
  SiteEntryMapper,
  SiteEntryRowWithSite,
} from '../mappers/site-entry.mapper';

const SITE_ENTRY_WITH_SITE_INCLUDE = {
  site: { include: { tags: { include: { tag: true } } } },
} satisfies Prisma.SiteEntryInclude;

@Injectable()
export class PrismaSiteEntryRepository implements SiteEntryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserAndSite(userId: string, siteId: string): Promise<SiteEntry | null> {
    const row = await this.prisma.siteEntry.findUnique({
      where: { userId_siteId: { userId, siteId } },
    });
    return row ? SiteEntryMapper.toDomain(row) : null;
  }

  async upsertStatus(data: UpsertSiteEntryStatusData): Promise<SiteEntry> {
    const row = await this.prisma.siteEntry.upsert({
      where: { userId_siteId: { userId: data.userId, siteId: data.siteId } },
      create: {
        id: randomUUID(),
        userId: data.userId,
        siteId: data.siteId,
        status: data.status,
      },
      update: { status: data.status },
    });
    return SiteEntryMapper.toDomain(row);
  }

  async updateScore(entryId: string, score: number): Promise<SiteEntry> {
    const row = await this.prisma.siteEntry.update({
      where: { id: entryId },
      data: { score },
    });
    return SiteEntryMapper.toDomain(row);
  }

  async listRankedBucket(
    userId: string,
    scoreRange: { min: number; max: number },
    excludeEntryId: string,
  ): Promise<SiteEntry[]> {
    const rows = await this.prisma.siteEntry.findMany({
      where: {
        userId,
        status: 'VISITED',
        score: { gte: scoreRange.min, lte: scoreRange.max },
        id: { not: excludeEntryId },
      },
      // Orden estable: score DESC (mejor primero) con id como desempate, para
      // que el bucket salga en el mismo orden en cada paso del flujo de
      // puntuación (ver domain/ranking/).
      orderBy: [{ score: 'desc' }, { id: 'asc' }],
    });
    return rows.map((row) => SiteEntryMapper.toDomain(row));
  }

  async listByUser(
    opts: ListMySiteEntriesOptions,
  ): Promise<CursorPage<SiteEntryWithSite>> {
    const filters: Prisma.SiteEntryWhereInput = {
      userId: opts.userId,
      ...(opts.status ? { status: opts.status } : {}),
    };
    const where: Prisma.SiteEntryWhereInput = opts.cursor
      ? { AND: [filters, this.createdAtCursorWhere(opts.cursor)] }
      : filters;

    const rows = await this.prisma.siteEntry.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: opts.limit + 1,
      include: SITE_ENTRY_WITH_SITE_INCLUDE,
    });

    const hasMore = rows.length > opts.limit;
    const slice = hasMore ? rows.slice(0, opts.limit) : rows;
    const last = hasMore ? slice[slice.length - 1] : null;

    return {
      items: slice.map((row) =>
        SiteEntryMapper.toDomainWithSite(row as SiteEntryRowWithSite),
      ),
      nextCursor: last
        ? CursorCodec.encode({ id: last.id, createdAt: last.createdAt.toISOString() })
        : null,
    };
  }

  async listFeed(opts: ListFeedOptions): Promise<CursorPage<SiteEntryWithSite>> {
    const filters: Prisma.SiteEntryWhereInput = {
      userId: { in: opts.userIds },
      status: 'VISITED',
      score: { not: null },
    };
    const where: Prisma.SiteEntryWhereInput = opts.cursor
      ? { AND: [filters, this.createdAtCursorWhere(opts.cursor)] }
      : filters;

    const rows = await this.prisma.siteEntry.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: opts.limit + 1,
      include: SITE_ENTRY_WITH_SITE_INCLUDE,
    });

    const hasMore = rows.length > opts.limit;
    const slice = hasMore ? rows.slice(0, opts.limit) : rows;
    const last = hasMore ? slice[slice.length - 1] : null;

    return {
      items: slice.map((row) =>
        SiteEntryMapper.toDomainWithSite(row as SiteEntryRowWithSite),
      ),
      nextCursor: last
        ? CursorCodec.encode({ id: last.id, createdAt: last.createdAt.toISOString() })
        : null,
    };
  }

  private createdAtCursorWhere(cursor: string): Prisma.SiteEntryWhereInput {
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
