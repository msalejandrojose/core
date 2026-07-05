import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type { SendingAccountType } from '../../domain/entities/sending-account-type.entity';
import {
  type CreateSendingAccountTypeData,
  type SendingAccountTypeRepositoryPort,
} from '../../application/ports/sending-account-type-repository.port';
import { toSendingAccountTypeDomain } from '../mappers/sending-account-type.mapper';

@Injectable()
export class PrismaSendingAccountTypeRepository implements SendingAccountTypeRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateSendingAccountTypeData,
  ): Promise<SendingAccountType> {
    const row = await this.prisma.sendingAccountType.create({
      data: {
        key: data.key,
        name: data.name,
        channel: data.channel,
        configSchema: data.configSchema as unknown as Prisma.InputJsonValue,
        messageSchema: data.messageSchema as unknown as Prisma.InputJsonValue,
        isActive: data.isActive,
      },
    });
    return toSendingAccountTypeDomain(row);
  }

  async list(): Promise<SendingAccountType[]> {
    const rows = await this.prisma.sendingAccountType.findMany({
      orderBy: { name: 'asc' },
    });
    return rows.map(toSendingAccountTypeDomain);
  }

  async findById(id: string): Promise<SendingAccountType | null> {
    const row = await this.prisma.sendingAccountType.findUnique({
      where: { id },
    });
    return row ? toSendingAccountTypeDomain(row) : null;
  }

  async findByKey(key: string): Promise<SendingAccountType | null> {
    const row = await this.prisma.sendingAccountType.findUnique({
      where: { key },
    });
    return row ? toSendingAccountTypeDomain(row) : null;
  }
}
