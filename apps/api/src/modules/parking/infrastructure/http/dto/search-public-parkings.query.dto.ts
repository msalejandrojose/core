import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';
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
}
