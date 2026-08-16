import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CursorCodec, CursorPage } from '../../../../shared/pagination';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import {
  AdminListTracksOptions,
  CreateTrackData,
  ListTracksOptions,
  TrackRepositoryPort,
  UpdateTrackPatch,
} from '../../application/ports/track-repository.port';
import { Track } from '../../domain/entities/track.entity';
import { toTrackDomain } from '../mappers/track.mapper';

@Injectable()
export class PrismaTrackRepository implements TrackRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findBySlug(slug: string): Promise<Track | null> {
    const row = await this.prisma.track.findUnique({ where: { slug } });
    return row === null ? null : toTrackDomain(row);
  }

  async findById(id: string): Promise<Track | null> {
    const row = await this.prisma.track.findUnique({ where: { id } });
    return row === null ? null : toTrackDomain(row);
  }

  async existsSlug(slug: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.track.count({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    return count > 0;
  }

  async listAll(opts: AdminListTracksOptions): Promise<PaginatedResult<Track>> {
    const where: Prisma.TrackWhereInput = opts.search
      ? {
          OR: [
            { slug: { contains: opts.search } },
            { name: { contains: opts.search } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.track.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: opts.limit,
        skip: (opts.page - 1) * opts.limit,
      }),
      this.prisma.track.count({ where }),
    ]);

    return { items: rows.map(toTrackDomain), total };
  }

  async create(data: CreateTrackData): Promise<Track> {
    const row = await this.prisma.track.create({
      data: {
        slug: data.slug,
        name: data.name,
        sectorCount: data.sectorCount,
        minPlausibleMs: data.minPlausibleMs,
        path: data.path as unknown as Prisma.InputJsonValue,
        theme: data.theme,
        grip: data.grip,
        isActive: data.isActive,
        imageId: data.imageId ?? null,
      },
    });
    return toTrackDomain(row);
  }

  async update(id: string, patch: UpdateTrackPatch): Promise<Track> {
    const data: Prisma.TrackUncheckedUpdateInput = {};
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.sectorCount !== undefined) data.sectorCount = patch.sectorCount;
    if (patch.minPlausibleMs !== undefined) {
      data.minPlausibleMs = patch.minPlausibleMs;
    }
    if (patch.path !== undefined) {
      data.path = patch.path as unknown as Prisma.InputJsonValue;
    }
    if (patch.theme !== undefined) data.theme = patch.theme;
    if (patch.grip !== undefined) data.grip = patch.grip;
    if (patch.isActive !== undefined) data.isActive = patch.isActive;
    if (patch.imageId !== undefined) data.imageId = patch.imageId;

    const row = await this.prisma.track.update({ where: { id }, data });
    return toTrackDomain(row);
  }

  async listActive(opts: ListTracksOptions): Promise<CursorPage<Track>> {
    const where: Prisma.TrackWhereInput = opts.cursor
      ? { AND: [{ isActive: true }, this.cursorWhere(opts.cursor)] }
      : { isActive: true };

    const rows = await this.prisma.track.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: opts.limit + 1,
    });

    const hasMore = rows.length > opts.limit;
    const slice = hasMore ? rows.slice(0, opts.limit) : rows;
    const last = hasMore ? slice[slice.length - 1] : null;

    return {
      items: slice.map(toTrackDomain),
      nextCursor: last
        ? CursorCodec.encode({
            id: last.id,
            createdAt: last.createdAt.toISOString(),
          })
        : null,
    };
  }

  private cursorWhere(cursor: string): Prisma.TrackWhereInput {
    const decoded = CursorCodec.decode(cursor);
    const date = new Date(decoded.createdAt);
    return {
      OR: [
        { createdAt: { lt: date } },
        { AND: [{ createdAt: date }, { id: { gt: decoded.id } }] },
      ],
    };
  }
}
