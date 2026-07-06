import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
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

  @ApiPropertyOptional({ enum: STATUSES, description: 'Filtra por estado.' })
  @IsOptional()
  @IsIn(STATUSES)
  status?: DeliveryStatus;

  @ApiPropertyOptional({ description: 'Filtra por destinatario.' })
  @IsOptional()
  @IsString()
  to?: string;
}
