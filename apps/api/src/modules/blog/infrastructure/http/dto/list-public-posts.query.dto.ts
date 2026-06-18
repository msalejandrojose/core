import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CursorPaginationQueryDto } from '../../../../../shared/pagination';

// Listado público: cursor-paginado por `publishedAt DESC`. Filtros por slug.
export class ListPublicPostsQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ description: 'Slug de la categoría a filtrar.' })
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiPropertyOptional({ description: 'Slug de la etiqueta a filtrar.' })
  @IsOptional()
  @IsString()
  tagSlug?: string;
}
