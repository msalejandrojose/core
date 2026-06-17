import { ApiProperty } from '@nestjs/swagger';

/**
 * `meta` de una respuesta paginada por cursor. `nextCursor` es `null`
 * cuando ya no hay más resultados.
 */
export class CursorMetaDto {
  @ApiProperty({ example: 20, description: 'Tamaño de página devuelto.' })
  limit!: number;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'eyJpZCI6IjAxOTIuLi4ifQ',
    description: 'Cursor para la siguiente página. `null` si no hay más.',
  })
  nextCursor!: string | null;

  @ApiProperty({ example: true, description: 'Hay más resultados disponibles.' })
  hasMore!: boolean;
}

/**
 * `meta` de una respuesta paginada por offset. Solo se usa en endpoints
 * que opten explícitamente por paginación offset.
 */
export class OffsetMetaDto {
  @ApiProperty({ example: 2, description: 'Página actual (1-based).' })
  page!: number;

  @ApiProperty({ example: 20, description: 'Tamaño de página devuelto.' })
  limit!: number;

  @ApiProperty({ example: 437, description: 'Total de resultados.' })
  total!: number;

  @ApiProperty({ example: 22, description: 'Total de páginas.' })
  totalPages!: number;
}
