import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CursorCodec, CursorPage } from '../../../../shared/pagination';
import {
  ListTracksOptions,
  TrackRepositoryPort,
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
