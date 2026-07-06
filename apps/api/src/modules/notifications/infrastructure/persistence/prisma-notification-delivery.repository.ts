import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CursorCodec, type CursorPage } from '../../../../shared/pagination';
import type { NotificationDelivery } from '../../domain/entities/notification-delivery.entity';
import {
  type CreateDeliveryData,
  type ListDeliveriesOptions,
  type NotificationDeliveryRepositoryPort,
  type UpdateDeliveryData,
} from '../../application/ports/notification-delivery-repository.port';
import { toNotificationDeliveryDomain } from '../mappers/notification-delivery.mapper';

@Injectable()
export class PrismaNotificationDeliveryRepository implements NotificationDeliveryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateDeliveryData): Promise<NotificationDelivery> {
    const row = await this.prisma.notificationDelivery.create({
      data: {
        messageTypeId: data.messageTypeId,
        messageTypeKey: data.messageTypeKey,
        accountId: data.accountId,
        channel: data.channel,
        provider: data.provider,
        toAddress: data.toAddress,
        subject: data.subject,
        status: data.status,
      },
    });
    return toNotificationDeliveryDomain(row);
  }

  async update(
    id: string,
    data: UpdateDeliveryData,
  ): Promise<NotificationDelivery> {
    const patch: Prisma.NotificationDeliveryUncheckedUpdateInput = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.providerMessageId !== undefined) {
      patch.providerMessageId = data.providerMessageId;
    }
    if (data.error !== undefined) patch.error = data.error;
    if (data.events !== undefined) {
      patch.events = data.events as unknown as Prisma.InputJsonValue;
    }
    if (data.sentAt !== undefined) patch.sentAt = data.sentAt;
    if (data.deliveredAt !== undefined) patch.deliveredAt = data.deliveredAt;
    if (data.lastEventAt !== undefined) patch.lastEventAt = data.lastEventAt;

    const row = await this.prisma.notificationDelivery.update({
      where: { id },
      data: patch,
    });
    return toNotificationDeliveryDomain(row);
  }

  async findById(id: string): Promise<NotificationDelivery | null> {
    const row = await this.prisma.notificationDelivery.findUnique({
      where: { id },
    });
    return row ? toNotificationDeliveryDomain(row) : null;
  }

  async findByProviderMessageId(
    provider: string,
    providerMessageId: string,
  ): Promise<NotificationDelivery | null> {
    const row = await this.prisma.notificationDelivery.findFirst({
      where: { provider, providerMessageId },
      orderBy: { createdAt: 'desc' },
    });
    return row ? toNotificationDeliveryDomain(row) : null;
  }

  async list(
    opts: ListDeliveriesOptions,
  ): Promise<CursorPage<NotificationDelivery>> {
    const filters: Prisma.NotificationDeliveryWhereInput = {
      ...(opts.messageTypeKey ? { messageTypeKey: opts.messageTypeKey } : {}),
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.toAddress ? { toAddress: opts.toAddress } : {}),
    };
    const where: Prisma.NotificationDeliveryWhereInput = opts.cursor
      ? { AND: [filters, this.cursorWhere(opts.cursor)] }
      : filters;

    const rows = await this.prisma.notificationDelivery.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: opts.limit + 1,
    });

    const hasMore = rows.length > opts.limit;
    const slice = hasMore ? rows.slice(0, opts.limit) : rows;
    const last = hasMore ? slice[slice.length - 1] : null;
    return {
      items: slice.map(toNotificationDeliveryDomain),
      nextCursor: last
        ? CursorCodec.encode({
            id: last.id,
            createdAt: last.createdAt.toISOString(),
          })
        : null,
    };
  }

  private cursorWhere(cursor: string): Prisma.NotificationDeliveryWhereInput {
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
