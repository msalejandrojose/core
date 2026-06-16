import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

/**
 * Query params para endpoints con paginación por offset. Solo se usa en
 * los listados que necesiten `jump-to-page` (p. ej. tablas de admin con
 * paginador clásico). Mutuamente excluyente con `cursor`.
 */
export class OffsetPaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Tamaño de página. Min 1, Max 100.',
    minimum: 1,
    maximum: 100,
    default: 20,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Número de página (1-based).',
    minimum: 1,
    default: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Ordenación, formato `field:asc` o `field:desc`.',
    default: 'createdAt:desc',
    type: String,
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z_][a-zA-Z0-9_]*:(asc|desc)$/, {
    message: 'sort debe tener formato `field:asc` o `field:desc`.',
  })
  sort?: string = 'createdAt:desc';
}
