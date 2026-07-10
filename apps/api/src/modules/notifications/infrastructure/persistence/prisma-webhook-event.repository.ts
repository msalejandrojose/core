import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CursorCodec, type CursorPage } from '../../../../shared/pagination';
import type { WebhookEvent } from '../../domain/entities/webhook-event.entity';
import {
  type CreateWebhookEventData,
  type ListWebhookEventsOptions,
  type UpdateWebhookEventData,
  type WebhookEventRepositoryPort,
} from '../../application/ports/webhook-event-repository.port';
import { toWebhookEventDomain } from '../mappers/webhook-event.mapper';

@Injectable()
export class PrismaWebhookEventRepository implements WebhookEventRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateWebhookEventData): Promise<WebhookEvent> {
    const row = await this.prisma.webhookEvent.create({
      data: {
        source: data.source,
        type: data.type,
        payload: data.payload as Prisma.InputJsonValue,
        signatureValid: data.signatureValid,
        status: data.status,
      },
    });
    return toWebhookEventDomain(row);
  }

  async update(
    id: string,
    data: UpdateWebhookEventData,
  ): Promise<WebhookEvent> {
    const patch: Prisma.WebhookEventUncheckedUpdateInput = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.result !== undefined) patch.result = data.result;
    if (data.error !== undefined) patch.error = data.error;
    if (data.processedAt !== undefined) patch.processedAt = data.processedAt;

    const row = await this.prisma.webhookEvent.update({
      where: { id },
      data: patch,
    });
    return toWebhookEventDomain(row);
  }

  async findById(id: string): Promise<WebhookEvent | null> {
    const row = await this.prisma.webhookEvent.findUnique({ where: { id } });
    return row ? toWebhookEventDomain(row) : null;
  }

  async list(
    opts: ListWebhookEventsOptions,
  ): Promise<CursorPage<WebhookEvent>> {
    const filters: Prisma.WebhookEventWhereInput = {
      ...(opts.source ? { source: opts.source } : {}),
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.createdFrom || opts.createdTo
        ? {
            createdAt: {
              ...(opts.createdFrom ? { gte: opts.createdFrom } : {}),
              ...(opts.createdTo ? { lte: opts.createdTo } : {}),
            },
          }
        : {}),
    };
    const where: Prisma.WebhookEventWhereInput = opts.cursor
      ? { AND: [filters, this.cursorWhere(opts.cursor)] }
      : filters;

    const rows = await this.prisma.webhookEvent.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: opts.limit + 1,
    });

    const hasMore = rows.length > opts.limit;
    const slice = hasMore ? rows.slice(0, opts.limit) : rows;
    const last = hasMore ? slice[slice.length - 1] : null;
    return {
      items: slice.map(toWebhookEventDomain),
      nextCursor: last
        ? CursorCodec.encode({
            id: last.id,
            createdAt: last.createdAt.toISOString(),
          })
        : null,
    };
  }

  private cursorWhere(cursor: string): Prisma.WebhookEventWhereInput {
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
