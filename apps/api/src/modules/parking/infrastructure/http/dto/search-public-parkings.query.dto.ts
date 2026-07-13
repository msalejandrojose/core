import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { CursorPaginationQueryDto } from '../../../../../shared/pagination';

export class SearchPublicParkingsQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ description: 'Texto libre: título o dirección.' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description:
      'Filtra plazas disponibles desde esta fecha (junto a `endDate`).',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description:
      'Filtra plazas disponibles hasta esta fecha (junto a `startDate`).',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Latitud del centro de búsqueda (junto a `lng`).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({
    description: 'Longitud del centro de búsqueda (junto a `lat`).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lng?: number;

  @ApiPropertyOptional({
    description: 'Radio de búsqueda en km desde `lat`/`lng`. Por defecto 15.',
    minimum: 0.1,
    maximum: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(200)
  radiusKm?: number;
}
