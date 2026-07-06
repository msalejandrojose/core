import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { NotificationChannel } from '@core/shared-types';
import type {
  DeliveryEvent,
  DeliveryStatus,
  NotificationDelivery,
} from '../../../domain/entities/notification-delivery.entity';

export class DeliveryResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional({ nullable: true }) messageTypeId: string | null;
  @ApiProperty() messageTypeKey: string;
  @ApiPropertyOptional({ nullable: true }) accountId: string | null;
  @ApiProperty() channel: NotificationChannel;
  @ApiProperty() provider: string;
  @ApiProperty() to: string;
  @ApiPropertyOptional({ nullable: true }) subject: string | null;
  @ApiProperty({
    enum: [
      'pending',
      'sent',
      'deferred',
      'delivered',
      'opened',
      'clicked',
      'unsubscribed',
      'spam',
      'dropped',
      'bounced',
      'failed',
    ],
  })
  status: DeliveryStatus;
  @ApiPropertyOptional({ nullable: true }) providerMessageId: string | null;
  @ApiPropertyOptional({ nullable: true }) error: string | null;
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  events: DeliveryEvent[];
  @ApiPropertyOptional({ nullable: true }) sentAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) deliveredAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) lastEventAt: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromDomain(d: NotificationDelivery): DeliveryResponseDto {
    const dto = new DeliveryResponseDto();
    dto.id = d.id;
    dto.messageTypeId = d.messageTypeId;
    dto.messageTypeKey = d.messageTypeKey;
    dto.accountId = d.accountId;
    dto.channel = d.channel;
    dto.provider = d.provider;
    dto.to = d.toAddress;
    dto.subject = d.subject;
    dto.status = d.status;
    dto.providerMessageId = d.providerMessageId;
    dto.error = d.error;
    dto.events = d.events;
    dto.sentAt = d.sentAt;
    dto.deliveredAt = d.deliveredAt;
    dto.lastEventAt = d.lastEventAt;
    dto.createdAt = d.createdAt;
    dto.updatedAt = d.updatedAt;
    return dto;
  }
}
