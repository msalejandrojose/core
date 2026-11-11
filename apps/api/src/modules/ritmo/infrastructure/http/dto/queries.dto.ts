import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Max,
  Min,
} from 'class-validator';
import { DAY_EXAMPLE, DAY_PATTERN } from './day.param';

export class DayQueryDto {
  @ApiPropertyOptional({
    example: DAY_EXAMPLE,
    description: 'Día a consultar. Por defecto, hoy en la zona del perfil.',
  })
  @IsOptional()
  @Matches(DAY_PATTERN, { message: 'day debe tener formato YYYY-MM-DD.' })
  day?: string;
}

export class ProgressQueryDto extends DayQueryDto {
  @ApiPropertyOptional({
    default: 30,
    minimum: 1,
    maximum: 365,
    description: 'Tamaño de la ventana en días, hacia atrás desde `day`.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;
}

export class SearchFoodsQueryDto {
  @ApiPropertyOptional({ example: 'arroz' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    example: '8480000123456',
    description: 'Búsqueda exacta por código de barras (escáner).',
  })
  @IsOptional()
  @Matches(/^\d{6,32}$/, { message: 'barcode debe ser numérico (EAN/UPC).' })
  barcode?: string;

  @ApiPropertyOptional({ default: 25, minimum: 1, maximum: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
