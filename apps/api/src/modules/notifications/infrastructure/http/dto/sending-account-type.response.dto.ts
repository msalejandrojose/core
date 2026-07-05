import { ApiProperty } from '@nestjs/swagger';
import {
  NOTIFICATION_CHANNELS,
  type NotificationChannel,
} from '@core/shared-types';
import type { SendingAccountType } from '../../../domain/entities/sending-account-type.entity';

export class SendingAccountTypeResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() key: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: NOTIFICATION_CHANNELS }) channel: NotificationChannel;
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  configSchema: unknown[];
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  messageSchema: unknown[];
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromDomain(type: SendingAccountType): SendingAccountTypeResponseDto {
    const dto = new SendingAccountTypeResponseDto();
    dto.id = type.id;
    dto.key = type.key;
    dto.name = type.name;
    dto.channel = type.channel;
    dto.configSchema = type.configSchema;
    dto.messageSchema = type.messageSchema;
    dto.isActive = type.isActive;
    dto.createdAt = type.createdAt;
    dto.updatedAt = type.updatedAt;
    return dto;
  }
}
