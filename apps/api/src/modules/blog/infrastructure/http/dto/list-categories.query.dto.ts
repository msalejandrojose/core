import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../../../shared/http/dto/pagination-query.dto';

// Listado de administración: offset-paginado (jump-to-page para el backoffice).
export class ListCategoriesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtra por nombre (substring).' })
  @IsOptional()
  @IsString()
  nameContains?: string;
}
