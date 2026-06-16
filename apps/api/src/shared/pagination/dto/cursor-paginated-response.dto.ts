import { ApiProperty } from '@nestjs/swagger';
import { CursorMetaDto } from './pagination-meta.dto';

export class CursorPaginatedResponseDto<T> {
  @ApiProperty({ isArray: true })
  data!: T[];

  @ApiProperty({ type: CursorMetaDto })
  meta!: CursorMetaDto;

  static of<T>(
    items: T[],
    nextCursor: string | null,
    limit: number,
  ): CursorPaginatedResponseDto<T> {
    const res = new CursorPaginatedResponseDto<T>();
    res.data = items;
    res.meta = { limit, nextCursor, hasMore: nextCursor !== null };
    return res;
  }
}
