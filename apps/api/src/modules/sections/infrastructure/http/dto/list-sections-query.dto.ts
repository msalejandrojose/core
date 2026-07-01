import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../../shared/http/dto/pagination-query.dto';
import { SectionScope } from '../../../domain/entities/section.entity';

export class ListSectionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['BACKOFFICE', 'APP', 'SHARED'] })
  @IsOptional()
  @IsEnum(['BACKOFFICE', 'APP', 'SHARED'] as SectionScope[])
  scope?: SectionScope;

  @ApiPropertyOptional({ description: 'Filtrar por estado activo.' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Subcadena en el code.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  codeContains?: string;

  @ApiPropertyOptional({ description: 'Subcadena en el name.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameContains?: string;
}
