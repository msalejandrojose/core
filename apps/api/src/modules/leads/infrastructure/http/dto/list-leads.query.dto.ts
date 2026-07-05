import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { CursorPaginationQueryDto } from '../../../../../shared/pagination';
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  type LeadSource,
  type LeadStatus,
} from '@core/shared-types';

export class ListLeadsQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ enum: LEAD_STATUSES })
  @IsOptional()
  @IsIn(LEAD_STATUSES)
  status?: LeadStatus;

  @ApiPropertyOptional({ enum: LEAD_SOURCES })
  @IsOptional()
  @IsIn(LEAD_SOURCES)
  source?: LeadSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tagId?: string;

  @ApiPropertyOptional({ description: 'Búsqueda por nombre, email o empresa.' })
  @IsOptional()
  @IsString()
  q?: string;
}
