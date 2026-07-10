import { ApiProperty } from '@nestjs/swagger';
import {
  NOTIFICATION_CHANNELS,
  type NotificationChannel,
} from '@core/shared-types';
import type {
  DeliveryStatus,
  NotificationDelivery,
} from '../../../domain/entities/notification-delivery.entity';
import { DeliveryEventDto } from './delivery-event.dto';

export class DeliveryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ type: String, nullable: true }) messageTypeId: string | null;
  @ApiProperty() messageTypeKey: string;
  @ApiProperty({ type: String, nullable: true }) accountId: string | null;
  @ApiProperty({ enum: NOTIFICATION_CHANNELS }) channel: NotificationChannel;
  @ApiProperty() provider: string;
  @ApiProperty() to: string;
  @ApiProperty({ type: String, nullable: true }) subject: string | null;
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
  @ApiProperty({ type: String, nullable: true }) providerMessageId:
    | string
    | null;
  @ApiProperty({ type: String, nullable: true }) error: string | null;
  @ApiProperty({ type: [DeliveryEventDto] })
  events: DeliveryEventDto[];
  @ApiProperty({ type: Date, nullable: true }) sentAt: Date | null;
  @ApiProperty({ type: Date, nullable: true }) deliveredAt: Date | null;
  @ApiProperty({ type: Date, nullable: true }) lastEventAt: Date | null;
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
    dto.events = d.events.map((e) => DeliveryEventDto.fromDomain(e));
    dto.sentAt = d.sentAt;
    dto.deliveredAt = d.deliveredAt;
    dto.lastEventAt = d.lastEventAt;
    dto.createdAt = d.createdAt;
    dto.updatedAt = d.updatedAt;
    return dto;
  }
}
