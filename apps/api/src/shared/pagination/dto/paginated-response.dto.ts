import { ApiProperty } from '@nestjs/swagger';
import { Type } from '@nestjs/common';
import { CursorMetaDto, OffsetMetaDto } from './pagination-meta.dto';

/**
 * Factory de DTOs paginados por cursor. Genera una clase dinámica cuyo
 * `data` es `T[]` y cuyo `meta` es `CursorMetaDto`, para que Swagger
 * tipe correctamente la respuesta y el cliente generado por `orval`/
 * `openapi-typescript` la reciba como `Paginated<T>` en vez de `any`.
 *
 * Uso:
 * ```ts
 * @Get()
 * @ApiOkResponse({ type: PaginatedResponseDto(UserResponseDto) })
 * list(@Query() q: CursorPaginationQueryDto) { ... }
 * ```
 *
 * Recuerda registrar el DTO genérico en `extraModels` de Swagger
 * (ver `main.ts`) para que aparezca correctamente en `/docs-json`.
 */
export function PaginatedResponseDto<T>(itemDto: Type<T>) {
  class PaginatedDto {
    @ApiProperty({ type: [itemDto] })
    data!: T[];

    @ApiProperty({ type: CursorMetaDto })
    meta!: CursorMetaDto;
  }

  Object.defineProperty(PaginatedDto, 'name', {
    value: `Paginated${itemDto.name}`,
  });

  return PaginatedDto;
}

/**
 * Factory equivalente para listados con paginación offset.
 */
export function OffsetPaginatedResponseDto<T>(itemDto: Type<T>) {
  class OffsetPaginatedDto {
    @ApiProperty({ type: [itemDto] })
    data!: T[];

    @ApiProperty({ type: OffsetMetaDto })
    meta!: OffsetMetaDto;
  }

  Object.defineProperty(OffsetPaginatedDto, 'name', {
    value: `OffsetPaginated${itemDto.name}`,
  });

  return OffsetPaginatedDto;
}
