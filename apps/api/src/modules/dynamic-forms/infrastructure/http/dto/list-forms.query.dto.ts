import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { CursorPaginationQueryDto } from '../../../../../shared/pagination';
import { FormStatus } from '../../../domain/entities/form.entity';

const FORM_STATUSES: FormStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

export class ListFormsQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ enum: FORM_STATUSES })
  @IsOptional()
  @IsIn(FORM_STATUSES)
  status?: FormStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  titleContains?: string;
}
