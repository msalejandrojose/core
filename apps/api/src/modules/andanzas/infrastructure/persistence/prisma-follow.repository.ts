import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CursorCodec, CursorPage } from '../../../../shared/pagination';
import { UserRef } from '../../domain/entities/user-ref.entity';
import {
  FollowRepositoryPort,
  ListFollowsOptions,
} from '../../application/ports/follow-repository.port';
import { UserRefMapper } from '../mappers/user-ref.mapper';

const USER_REF_SELECT = { id: true, firstName: true, lastName: true } satisfies Prisma.UserSelect;

@Injectable()
export class PrismaFollowRepository implements FollowRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async exists(followerId: string, followingId: string): Promise<boolean> {
    const row = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    return row !== null;
  }

  async create(followerId: string, followingId: string): Promise<void> {
    await this.prisma.follow.create({ data: { followerId, followingId } });
  }

  async delete(followerId: string, followingId: string): Promise<void> {
    // deleteMany en vez de delete: no lanza si ya no existía (idempotente).
    await this.prisma.follow.deleteMany({ where: { followerId, followingId } });
  }

  async listFollowingIds(followerId: string): Promise<string[]> {
    const rows = await this.prisma.follow.findMany({
      where: { followerId },
      select: { followingId: true },
    });
    return rows.map((r) => r.followingId);
  }

  async listFollowing(opts: ListFollowsOptions): Promise<CursorPage<UserRef>> {
    const filters: Prisma.FollowWhereInput = { followerId: opts.userId };
    const where: Prisma.FollowWhereInput = opts.cursor
      ? { AND: [filters, this.cursorWhere(opts.cursor, 'followingId')] }
      : filters;

    const rows = await this.prisma.follow.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { followingId: 'asc' }],
      take: opts.limit + 1,
      include: { following: { select: USER_REF_SELECT } },
    });

    const hasMore = rows.length > opts.limit;
    const slice = hasMore ? rows.slice(0, opts.limit) : rows;
    const last = hasMore ? slice[slice.length - 1] : null;
    return {
      items: slice.map((r) => UserRefMapper.toDomain(r.following)),
      nextCursor: last
        ? CursorCodec.encode({ id: last.followingId, createdAt: last.createdAt.toISOString() })
        : null,
    };
  }

  async listFollowers(opts: ListFollowsOptions): Promise<CursorPage<UserRef>> {
    const filters: Prisma.FollowWhereInput = { followingId: opts.userId };
    const where: Prisma.FollowWhereInput = opts.cursor
      ? { AND: [filters, this.cursorWhere(opts.cursor, 'followerId')] }
      : filters;

    const rows = await this.prisma.follow.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { followerId: 'asc' }],
      take: opts.limit + 1,
      include: { follower: { select: USER_REF_SELECT } },
    });

    const hasMore = rows.length > opts.limit;
    const slice = hasMore ? rows.slice(0, opts.limit) : rows;
    const last = hasMore ? slice[slice.length - 1] : null;
    return {
      items: slice.map((r) => UserRefMapper.toDomain(r.follower)),
      nextCursor: last
        ? CursorCodec.encode({ id: last.followerId, createdAt: last.createdAt.toISOString() })
        : null,
    };
  }

  // `idField` es followingId (listFollowing) o followerId (listFollowers) —
  // el otro lado de la clave compuesta, único dentro del userId fijado por
  // el filtro principal.
  private cursorWhere(
    cursor: string,
    idField: 'followingId' | 'followerId',
  ): Prisma.FollowWhereInput {
    const decoded = CursorCodec.decode(cursor);
    const date = new Date(decoded.createdAt);
    return {
      OR: [
        { createdAt: { lt: date } },
        { createdAt: date, [idField]: { gt: decoded.id } },
      ],
    };
  }
}
