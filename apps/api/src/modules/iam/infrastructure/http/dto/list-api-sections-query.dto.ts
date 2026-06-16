import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../../shared/http/dto/pagination-query.dto';

export class ListApiSectionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Solo hijas directas de este id.' })
  @IsOptional()
  @IsUUID()
  parentSectionId?: string;

  @ApiPropertyOptional({ description: 'Subcadena en el code.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  codeContains?: string;
}
