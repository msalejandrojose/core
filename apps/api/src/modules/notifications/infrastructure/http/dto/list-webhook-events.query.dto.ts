import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { CursorPaginationQueryDto } from '../../../../../shared/pagination';
import type { WebhookEventStatus } from '../../../domain/entities/webhook-event.entity';

const STATUSES: WebhookEventStatus[] = ['pending', 'processed', 'failed'];

export class ListWebhookEventsQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filtra por fuente (p. ej. "sendgrid").',
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ enum: STATUSES, description: 'Filtra por estado.' })
  @IsOptional()
  @IsIn(STATUSES)
  status?: WebhookEventStatus;

  @ApiPropertyOptional({
    description: 'Fecha de recepción desde (ISO-8601, inclusive).',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Fecha de recepción hasta (ISO-8601, inclusive).',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
