import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../../shared/http/dto/pagination-query.dto';
import type { WorkflowRunStatus } from '../../../domain/entities/workflow-run.entity';

const RUN_STATUSES: WorkflowRunStatus[] = [
  'RUNNING',
  'WAITING',
  'COMPLETED',
  'FAILED',
  'CANCELED',
];

export class ListRunsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: RUN_STATUSES })
  @IsOptional()
  @IsIn(RUN_STATUSES)
  status?: WorkflowRunStatus;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Id de la definición (versión concreta).',
  })
  @IsOptional()
  @IsUUID()
  definitionId?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;
}
