import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { NotificationChannel } from '@core/shared-types';
import type { MessageType } from '../../../domain/entities/message-type.entity';

class MessageTypeAccountDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() channel: NotificationChannel;
}

export class MessageTypeResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() key: string;
  @ApiProperty() name: string;
  @ApiProperty() accountId: string;
  @ApiPropertyOptional({ type: MessageTypeAccountDto })
  account?: MessageTypeAccountDto;
  @ApiProperty({ type: 'object', additionalProperties: true })
  content: Record<string, unknown>;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromDomain(mt: MessageType): MessageTypeResponseDto {
    const dto = new MessageTypeResponseDto();
    dto.id = mt.id;
    dto.key = mt.key;
    dto.name = mt.name;
    dto.accountId = mt.accountId;
    if (mt.account && mt.account.type) {
      dto.account = {
        id: mt.account.id,
        name: mt.account.name,
        channel: mt.account.type.channel,
      };
    }
    dto.content = mt.content;
    dto.isActive = mt.isActive;
    dto.createdAt = mt.createdAt;
    dto.updatedAt = mt.updatedAt;
    return dto;
  }
}
