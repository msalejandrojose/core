import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../../../shared/http/dto/pagination-query.dto';
import { CarPartCategory } from '../../../domain/entities/car-part.entity';

export class ListAdminCarPartsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtra por code o nombre (substring).' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: CarPartCategory })
  @IsOptional()
  @IsEnum(CarPartCategory)
  category?: CarPartCategory;
}
