import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type { WhatsappMessage } from '../../domain/entities/whatsapp-message.entity';
import type {
  CreateMessageData,
  WhatsappMessageRepositoryPort,
} from '../../application/ports/whatsapp-message-repository.port';
import type { WhatsappMessageStatus } from '../../domain/entities/whatsapp-message.entity';
import { WhatsappMapper } from './whatsapp.mapper';

@Injectable()
export class PrismaWhatsappMessageRepository
  implements WhatsappMessageRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateMessageData): Promise<WhatsappMessage> {
    const row = await this.prisma.whatsappMessage.create({
      data: {
        conversationId: data.conversationId,
        direction: data.direction,
        waMessageId: data.waMessageId,
        body: data.body,
        status: data.status,
        timestamp: data.timestamp,
      },
    });
    return WhatsappMapper.messageToDomain(row);
  }

  async existsByWaMessageId(waMessageId: string): Promise<boolean> {
    const count = await this.prisma.whatsappMessage.count({
      where: { waMessageId },
    });
    return count > 0;
  }

  async listByConversation(
    conversationId: string,
    limit: number,
  ): Promise<WhatsappMessage[]> {
    // Traemos los `limit` más recientes pero los devolvemos en orden ascendente
    // (los más antiguos arriba) para pintar el hilo directamente.
    const rows = await this.prisma.whatsappMessage.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
    return rows
      .reverse()
      .map((row) => WhatsappMapper.messageToDomain(row));
  }

  async updateStatusByWaMessageId(
    waMessageId: string,
    status: WhatsappMessageStatus,
  ): Promise<WhatsappMessage | null> {
    const existing = await this.prisma.whatsappMessage.findUnique({
      where: { waMessageId },
    });
    if (!existing) return null;
    const row = await this.prisma.whatsappMessage.update({
      where: { waMessageId },
      data: { status },
    });
    return WhatsappMapper.messageToDomain(row);
  }
}
