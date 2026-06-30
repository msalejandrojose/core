import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import type { SectionScope } from '../../../domain/entities/section.entity';

const SCOPES: SectionScope[] = ['BACKOFFICE', 'APP', 'SHARED'];

export class TreeQueryDto {
  @ApiPropertyOptional({
    enum: SCOPES,
    description: 'Scope a devolver. Por defecto BACKOFFICE.',
  })
  @IsOptional()
  @IsIn(SCOPES)
  scope?: SectionScope;
}
