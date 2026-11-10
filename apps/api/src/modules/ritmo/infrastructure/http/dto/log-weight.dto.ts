import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DAY_EXAMPLE, DAY_PATTERN } from './day.param';

export class LogWeightDto {
  @ApiProperty({ example: 80.4, minimum: 25, maximum: 400 })
  @IsNumber()
  @Min(25)
  @Max(400)
  weightKg!: number;

  @ApiPropertyOptional({
    example: DAY_EXAMPLE,
    description: 'Día medido. Por defecto, hoy en la zona horaria del perfil.',
  })
  @IsOptional()
  @Matches(DAY_PATTERN, { message: 'measuredOn debe tener formato YYYY-MM-DD.' })
  measuredOn?: string;

  @ApiPropertyOptional({ example: 18.5, minimum: 1, maximum: 75 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(75)
  bodyFatPct?: number;

  @ApiPropertyOptional({ example: 84, minimum: 30, maximum: 250 })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(250)
  waistCm?: number;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
