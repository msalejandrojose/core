import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CursorMetaDto {
  @ApiProperty()
  limit!: number;

  @ApiPropertyOptional({ nullable: true, type: String })
  nextCursor!: string | null;

  @ApiProperty()
  hasMore!: boolean;
}

export class OffsetMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}
