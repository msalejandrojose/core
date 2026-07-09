import { ApiProperty } from '@nestjs/swagger';
import type { WhatsappConversation } from '../../../domain/entities/whatsapp-conversation.entity';

export class WhatsappConversationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  accountId!: string;

  @ApiProperty()
  contactPhone!: string;

  @ApiProperty({ nullable: true })
  contactName!: string | null;

  @ApiProperty({ nullable: true })
  lastMessagePreview!: string | null;

  @ApiProperty({ enum: ['INBOUND', 'OUTBOUND'] })
  lastDirection!: 'INBOUND' | 'OUTBOUND';

  @ApiProperty()
  unreadCount!: number;

  @ApiProperty({ format: 'date-time' })
  lastMessageAt!: string;

  static fromDomain(c: WhatsappConversation): WhatsappConversationResponseDto {
    const dto = new WhatsappConversationResponseDto();
    dto.id = c.id;
    dto.accountId = c.accountId;
    dto.contactPhone = c.contactPhone;
    dto.contactName = c.contactName;
    dto.lastMessagePreview = c.lastMessagePreview;
    dto.lastDirection = c.lastDirection;
    dto.unreadCount = c.unreadCount;
    dto.lastMessageAt = c.lastMessageAt.toISOString();
    return dto;
  }
}
