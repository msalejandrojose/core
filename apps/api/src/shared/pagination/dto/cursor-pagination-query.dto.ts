import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

/**
 * Query params estándar para endpoints con paginación por cursor. Se
 * declara una vez aquí y todos los endpoints de listado extienden o
 * componen esta clase en su propio `*-query.dto.ts`.
 *
 * - `limit`: tamaño de página. Default 20, min 1, max 100.
 * - `cursor`: cursor opaco devuelto en el `meta.nextCursor` de la página
 *   anterior. Si es inválido se lanza `INVALID_CURSOR` (400).
 * - `sort`: orden por campo, formato `field:asc|desc`. El use case valida
 *   la whitelist de campos válidos. Default `createdAt:desc`.
 */
export class CursorPaginationQueryDto {
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
    description: 'Cursor opaco (base64url) devuelto en la página anterior.',
    type: String,
  })
  @IsOptional()
  @IsString()
  cursor?: string;

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
