import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

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
