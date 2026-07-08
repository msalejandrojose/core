import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CursorCodec, CursorPage } from '../../../../shared/pagination';
import { UserNotification } from '../../domain/entities/user-notification.entity';
import {
  CreateUserNotificationData,
  ListUserNotificationsOptions,
  UserNotificationRepositoryPort,
} from '../../application/ports/user-notification-repository.port';
import { toUserNotificationDomain } from '../mappers/user-notification.mapper';

function jsonInput(
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === null || value === undefined ? Prisma.DbNull : value;
}

@Injectable()
export class PrismaUserNotificationRepository implements UserNotificationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserNotificationData): Promise<UserNotification> {
    const row = await this.prisma.userNotification.create({
      data: {
        userId: data.userId,
        kind: data.kind,
        title: data.title,
        body: data.body,
        data: jsonInput(data.data),
      },
    });
    return toUserNotificationDomain(row);
  }

  async list(
    opts: ListUserNotificationsOptions,
  ): Promise<CursorPage<UserNotification>> {
    const filters: Prisma.UserNotificationWhereInput = {
      userId: opts.userId,
      ...(opts.unreadOnly ? { readAt: null } : {}),
    };

    const where: Prisma.UserNotificationWhereInput = opts.cursor
      ? { AND: [filters, this.cursorWhere(opts.cursor)] }
      : filters;

    const rows = await this.prisma.userNotification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: opts.limit + 1,
    });

    const hasMore = rows.length > opts.limit;
    const slice = hasMore ? rows.slice(0, opts.limit) : rows;
    const last = hasMore ? slice[slice.length - 1] : null;
    return {
      items: slice.map(toUserNotificationDomain),
      nextCursor: last
        ? CursorCodec.encode({
            id: last.id,
            createdAt: last.createdAt.toISOString(),
          })
        : null,
    };
  }

  countUnread(userId: string): Promise<number> {
    return this.prisma.userNotification.count({
      where: { userId, readAt: null },
    });
  }

  async markRead(id: string, userId: string): Promise<UserNotification | null> {
    // Reclamo condicionado por owner: solo actualiza si la notificación es del
    // usuario. Si no matchea (no existe o es de otro), `count` es 0 → null.
    const { count } = await this.prisma.userNotification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (count === 0) {
      // Puede que ya estuviera leída: devuélvela si existe y es del usuario.
      const existing = await this.prisma.userNotification.findFirst({
        where: { id, userId },
      });
      return existing ? toUserNotificationDomain(existing) : null;
    }
    const row = await this.prisma.userNotification.findUnique({
      where: { id },
    });
    return row ? toUserNotificationDomain(row) : null;
  }

  async markAllRead(userId: string): Promise<number> {
    const { count } = await this.prisma.userNotification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return count;
  }

  private cursorWhere(cursor: string): Prisma.UserNotificationWhereInput {
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
