import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CursorCodec, type CursorPage } from '../../../../shared/pagination';
import type { SendingAccount } from '../../domain/entities/sending-account.entity';
import {
  type CreateSendingAccountData,
  type ListSendingAccountsOptions,
  type SendingAccountRepositoryPort,
  type UpdateSendingAccountData,
} from '../../application/ports/sending-account-repository.port';
import { toSendingAccountDomain } from '../mappers/sending-account.mapper';

@Injectable()
export class PrismaSendingAccountRepository implements SendingAccountRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSendingAccountData): Promise<SendingAccount> {
    const row = await this.prisma.sendingAccount.create({
      data: {
        typeId: data.typeId,
        name: data.name,
        config: data.config as Prisma.InputJsonValue,
        isActive: data.isActive,
        isDefault: data.isDefault,
      },
      include: { type: true },
    });
    return toSendingAccountDomain(row);
  }

  async update(
    id: string,
    data: UpdateSendingAccountData,
  ): Promise<SendingAccount> {
    const patch: Prisma.SendingAccountUncheckedUpdateInput = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.config !== undefined) {
      patch.config = data.config as Prisma.InputJsonValue;
    }
    if (data.isActive !== undefined) patch.isActive = data.isActive;
    if (data.isDefault !== undefined) patch.isDefault = data.isDefault;

    const row = await this.prisma.sendingAccount.update({
      where: { id },
      data: patch,
      include: { type: true },
    });
    return toSendingAccountDomain(row);
  }

  async findById(id: string): Promise<SendingAccount | null> {
    const row = await this.prisma.sendingAccount.findUnique({
      where: { id },
      include: { type: true },
    });
    return row ? toSendingAccountDomain(row) : null;
  }

  async list(
    opts: ListSendingAccountsOptions,
  ): Promise<CursorPage<SendingAccount>> {
    const filters: Prisma.SendingAccountWhereInput = {
      ...(opts.typeId ? { typeId: opts.typeId } : {}),
      ...(opts.isActive !== undefined ? { isActive: opts.isActive } : {}),
    };
    const where: Prisma.SendingAccountWhereInput = opts.cursor
      ? { AND: [filters, this.cursorWhere(opts.cursor)] }
      : filters;

    const rows = await this.prisma.sendingAccount.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: opts.limit + 1,
      include: { type: true },
    });

    const hasMore = rows.length > opts.limit;
    const slice = hasMore ? rows.slice(0, opts.limit) : rows;
    const last = hasMore ? slice[slice.length - 1] : null;
    return {
      items: slice.map(toSendingAccountDomain),
      nextCursor: last
        ? CursorCodec.encode({
            id: last.id,
            createdAt: last.createdAt.toISOString(),
          })
        : null,
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.sendingAccount.delete({ where: { id } });
  }

  countMessageTypes(accountId: string): Promise<number> {
    return this.prisma.messageType.count({ where: { accountId } });
  }

  async clearDefaultForType(typeId: string, exceptId?: string): Promise<void> {
    await this.prisma.sendingAccount.updateMany({
      where: {
        typeId,
        isDefault: true,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      data: { isDefault: false },
    });
  }

  private cursorWhere(cursor: string): Prisma.SendingAccountWhereInput {
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
