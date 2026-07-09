import { ApiProperty } from '@nestjs/swagger';
import type { WhatsappMessage } from '../../../domain/entities/whatsapp-message.entity';

export class WhatsappMessageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  conversationId!: string;

  @ApiProperty({ enum: ['INBOUND', 'OUTBOUND'] })
  direction!: 'INBOUND' | 'OUTBOUND';

  @ApiProperty()
  body!: string;

  @ApiProperty({ description: 'received | sent | delivered | read | failed' })
  status!: string;

  @ApiProperty({ format: 'date-time' })
  timestamp!: string;

  static fromDomain(m: WhatsappMessage): WhatsappMessageResponseDto {
    const dto = new WhatsappMessageResponseDto();
    dto.id = m.id;
    dto.conversationId = m.conversationId;
    dto.direction = m.direction;
    dto.body = m.body;
    dto.status = m.status;
    dto.timestamp = m.timestamp.toISOString();
    return dto;
  }
}
