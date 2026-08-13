import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../../../shared/http/dto/pagination-query.dto';

// Listado de administración: offset-paginado, incluye circuitos inactivos.
export class ListAdminTracksQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtra por slug o nombre (substring).' })
  @IsOptional()
  @IsString()
  search?: string;
}
