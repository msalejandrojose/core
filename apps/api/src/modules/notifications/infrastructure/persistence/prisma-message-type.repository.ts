import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CursorCodec, type CursorPage } from '../../../../shared/pagination';
import type { MessageType } from '../../domain/entities/message-type.entity';
import {
  type CreateMessageTypeData,
  type ListMessageTypesOptions,
  type MessageTypeRepositoryPort,
  type UpdateMessageTypeData,
} from '../../application/ports/message-type-repository.port';
import { toMessageTypeDomain } from '../mappers/message-type.mapper';

// Carga el tipo de mensaje con su cuenta y el tipo de la cuenta, necesario para
// derivar el canal en el envío.
const WITH_ACCOUNT = {
  account: { include: { type: true } },
} satisfies Prisma.MessageTypeInclude;

@Injectable()
export class PrismaMessageTypeRepository implements MessageTypeRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateMessageTypeData): Promise<MessageType> {
    const row = await this.prisma.messageType.create({
      data: {
        key: data.key,
        name: data.name,
        accountId: data.accountId,
        content: data.content as Prisma.InputJsonValue,
        isActive: data.isActive,
      },
      include: WITH_ACCOUNT,
    });
    return toMessageTypeDomain(row);
  }

  async update(id: string, data: UpdateMessageTypeData): Promise<MessageType> {
    const patch: Prisma.MessageTypeUncheckedUpdateInput = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.accountId !== undefined) patch.accountId = data.accountId;
    if (data.content !== undefined) {
      patch.content = data.content as Prisma.InputJsonValue;
    }
    if (data.isActive !== undefined) patch.isActive = data.isActive;

    const row = await this.prisma.messageType.update({
      where: { id },
      data: patch,
      include: WITH_ACCOUNT,
    });
    return toMessageTypeDomain(row);
  }

  async findById(id: string): Promise<MessageType | null> {
    const row = await this.prisma.messageType.findUnique({
      where: { id },
      include: WITH_ACCOUNT,
    });
    return row ? toMessageTypeDomain(row) : null;
  }

  async findByKey(key: string): Promise<MessageType | null> {
    const row = await this.prisma.messageType.findUnique({
      where: { key },
      include: WITH_ACCOUNT,
    });
    return row ? toMessageTypeDomain(row) : null;
  }

  async list(opts: ListMessageTypesOptions): Promise<CursorPage<MessageType>> {
    const filters: Prisma.MessageTypeWhereInput = {
      ...(opts.accountId ? { accountId: opts.accountId } : {}),
      ...(opts.isActive !== undefined ? { isActive: opts.isActive } : {}),
    };
    const where: Prisma.MessageTypeWhereInput = opts.cursor
      ? { AND: [filters, this.cursorWhere(opts.cursor)] }
      : filters;

    const rows = await this.prisma.messageType.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: opts.limit + 1,
      include: WITH_ACCOUNT,
    });

    const hasMore = rows.length > opts.limit;
    const slice = hasMore ? rows.slice(0, opts.limit) : rows;
    const last = hasMore ? slice[slice.length - 1] : null;
    return {
      items: slice.map(toMessageTypeDomain),
      nextCursor: last
        ? CursorCodec.encode({
            id: last.id,
            createdAt: last.createdAt.toISOString(),
          })
        : null,
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.messageType.delete({ where: { id } });
  }

  private cursorWhere(cursor: string): Prisma.MessageTypeWhereInput {
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
