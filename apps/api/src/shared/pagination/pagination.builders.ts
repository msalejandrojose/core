import { Page } from './pagination.types';
import { CursorMetaDto, OffsetMetaDto } from './dto/pagination-meta.dto';

/**
 * Helpers de construcción del envelope `{ data, meta }`. Los controllers
 * los usan después de invocar al use case para no tener que repetir el
 * mapping del meta en cada endpoint.
 */

export function buildCursorPaginatedResponse<TDomain, TDto>(
  page: Page<TDomain>,
  limit: number,
  mapItem: (item: TDomain) => TDto,
): { data: TDto[]; meta: CursorMetaDto } {
  return {
    data: page.items.map(mapItem),
    meta: {
      limit,
      nextCursor: page.nextCursor,
      hasMore: page.nextCursor !== null,
    },
  };
}

export function buildOffsetPaginatedResponse<TDomain, TDto>(
  items: TDomain[],
  total: number,
  page: number,
  limit: number,
  mapItem: (item: TDomain) => TDto,
): { data: TDto[]; meta: OffsetMetaDto } {
  return {
    data: items.map(mapItem),
    meta: {
      page,
      limit,
      total,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
    },
  };
}
