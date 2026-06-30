import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { type FormStatus } from '../../../domain/entities/form.entity';

const FORM_STATUSES: FormStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

export class UpdateFormDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  schema?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: FORM_STATUSES })
  @IsOptional()
  @IsIn(FORM_STATUSES)
  status?: FormStatus;
}
