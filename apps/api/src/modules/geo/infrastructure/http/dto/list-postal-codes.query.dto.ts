import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../../shared/http/dto/pagination-query.dto';

export class ListPostalCodesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtra por código (substring).' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filtra por municipio.' })
  @IsOptional()
  @IsUUID()
  municipalityId?: string;
}
