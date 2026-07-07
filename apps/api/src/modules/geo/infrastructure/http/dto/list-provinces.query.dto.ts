import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../../shared/http/dto/pagination-query.dto';

export class ListProvincesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filtra por nombre o código (substring).',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filtra por país.' })
  @IsOptional()
  @IsUUID()
  countryId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Filtra por comunidad autónoma.',
  })
  @IsOptional()
  @IsUUID()
  regionId?: string;
}
