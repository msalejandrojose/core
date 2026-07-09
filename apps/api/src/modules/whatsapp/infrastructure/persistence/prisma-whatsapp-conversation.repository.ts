import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type { WhatsappConversation } from '../../domain/entities/whatsapp-conversation.entity';
import type {
  CreateConversationData,
  ListConversationsOptions,
  TouchConversationData,
  WhatsappConversationRepositoryPort,
} from '../../application/ports/whatsapp-conversation-repository.port';
import { WhatsappMapper } from './whatsapp.mapper';

@Injectable()
export class PrismaWhatsappConversationRepository
  implements WhatsappConversationRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<WhatsappConversation | null> {
    const row = await this.prisma.whatsappConversation.findUnique({
      where: { id },
    });
    return row ? WhatsappMapper.conversationToDomain(row) : null;
  }

  async findByAccountAndContact(
    accountId: string,
    contactPhone: string,
  ): Promise<WhatsappConversation | null> {
    const row = await this.prisma.whatsappConversation.findUnique({
      where: { accountId_contactPhone: { accountId, contactPhone } },
    });
    return row ? WhatsappMapper.conversationToDomain(row) : null;
  }

  async create(data: CreateConversationData): Promise<WhatsappConversation> {
    const row = await this.prisma.whatsappConversation.create({
      data: {
        accountId: data.accountId,
        contactPhone: data.contactPhone,
        contactName: data.contactName,
      },
    });
    return WhatsappMapper.conversationToDomain(row);
  }

  async list(opts: ListConversationsOptions): Promise<WhatsappConversation[]> {
    const rows = await this.prisma.whatsappConversation.findMany({
      where: opts.accountId ? { accountId: opts.accountId } : undefined,
      orderBy: { lastMessageAt: 'desc' },
      take: opts.limit,
    });
    return rows.map((row) => WhatsappMapper.conversationToDomain(row));
  }

  async touch(
    id: string,
    data: TouchConversationData,
  ): Promise<WhatsappConversation> {
    const row = await this.prisma.whatsappConversation.update({
      where: { id },
      data: {
        lastMessageAt: data.lastMessageAt,
        lastMessagePreview: data.lastMessagePreview,
        lastDirection: data.lastDirection,
        ...(data.incrementUnread ? { unreadCount: { increment: 1 } } : {}),
        // Solo fija el nombre si Meta lo trae (no lo borra si ya existía).
        ...(data.contactName ? { contactName: data.contactName } : {}),
      },
    });
    return WhatsappMapper.conversationToDomain(row);
  }

  async resetUnread(id: string): Promise<WhatsappConversation> {
    const row = await this.prisma.whatsappConversation.update({
      where: { id },
      data: { unreadCount: 0 },
    });
    return WhatsappMapper.conversationToDomain(row);
  }
}
