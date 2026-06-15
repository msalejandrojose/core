import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ description: 'Página actual (1-indexed).' })
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty({ description: 'Total de elementos que matchean (sin paginar).' })
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

// Envelope genérico para listados. Usar con `@ApiPaginatedResponse(EntityDto)`
// en el controller para que Swagger expanda el tipo correctamente.
//
// `T` se usa solo en TS — Swagger no ve genéricos en runtime, por eso el
// helper `ApiPaginatedResponse` registra el schema explícitamente.
export class PaginatedResponseDto<T> {
  @ApiProperty({ isArray: true })
  data!: T[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;

  static of<T>(
    items: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResponseDto<T> {
    const res = new PaginatedResponseDto<T>();
    res.data = items;
    res.meta = {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
    return res;
  }
}
