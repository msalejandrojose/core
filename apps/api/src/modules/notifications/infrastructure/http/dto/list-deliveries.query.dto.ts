import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  NOTIFICATION_CHANNELS,
  type NotificationChannel,
} from '@core/shared-types';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { CursorPaginationQueryDto } from '../../../../../shared/pagination';
import type { DeliveryStatus } from '../../../domain/entities/notification-delivery.entity';

const STATUSES: DeliveryStatus[] = [
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
];

export class ListDeliveriesQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtra por key del tipo de mensaje.' })
  @IsOptional()
  @IsString()
  messageTypeKey?: string;

  @ApiPropertyOptional({
    enum: NOTIFICATION_CHANNELS,
    description: 'Filtra por canal.',
  })
  @IsOptional()
  @IsIn(NOTIFICATION_CHANNELS)
  channel?: NotificationChannel;

  @ApiPropertyOptional({ enum: STATUSES, description: 'Filtra por estado.' })
  @IsOptional()
  @IsIn(STATUSES)
  status?: DeliveryStatus;

  @ApiPropertyOptional({ description: 'Búsqueda por destinatario (contiene).' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Fecha de envío desde (ISO-8601, inclusive).',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Fecha de envío hasta (ISO-8601, inclusive).',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
