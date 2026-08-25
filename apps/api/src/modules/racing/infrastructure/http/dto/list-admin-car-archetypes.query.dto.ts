import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../../../shared/http/dto/pagination-query.dto';

export class ListAdminCarArchetypesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtra por code o nombre (substring).' })
  @IsOptional()
  @IsString()
  search?: string;
}
