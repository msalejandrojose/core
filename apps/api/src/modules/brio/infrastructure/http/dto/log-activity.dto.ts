import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
  IsIn,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Max,
  Min,
} from 'class-validator';
import type { Effort } from '../../../domain/entities/activity-session.entity';

import { SessionExerciseDto } from './strength-sets.dto';

const EFFORTS: Effort[] = ['LIGHT', 'MODERATE', 'VIGOROUS'];

/** 12 h: por encima de esto es casi seguro un error de unidades del cliente. */
const MAX_DURATION_SEC = 12 * 60 * 60;

export class LogActivityDto {
  @ApiProperty({ description: 'Tipo de actividad del catálogo.' })
  @IsUUID()
  activityTypeId!: string;

  @ApiProperty({
    example: '2026-11-10T07:30:00.000Z',
    description:
      'Inicio de la sesión. El día natural se resuelve con la zona horaria del perfil.',
  })
  @IsISO8601()
  startedAt!: string;

  @ApiProperty({ example: 1800, minimum: 1, maximum: MAX_DURATION_SEC })
  @IsInt()
  @Min(1)
  @Max(MAX_DURATION_SEC)
  durationSec!: number;

  @ApiPropertyOptional({ example: 5200, description: 'Distancia en metros.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  distanceM?: number;

  @ApiPropertyOptional({ example: 148, minimum: 30, maximum: 250 })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(250)
  avgHeartRate?: number;

  @ApiPropertyOptional({ example: 176, minimum: 30, maximum: 250 })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(250)
  maxHeartRate?: number;

  @ApiPropertyOptional({
    example: 140,
    description: 'Desnivel positivo, en metros.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20000)
  elevationGainM?: number;

  @ApiPropertyOptional({
    example: 172,
    description: 'Cadencia media (pasos/min o rpm).',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(300)
  cadence?: number;

  @ApiPropertyOptional({
    example: 7,
    description: 'Esfuerzo percibido de la sesión, CR10 (1–10).',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  rpe?: number;

  @ApiPropertyOptional({
    example: [300, 1200, 600, 240, 60],
    description: 'Segundos en cada zona cardíaca, Z1 a Z5.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(5)
  @IsInt({ each: true })
  @Min(0, { each: true })
  zoneSeconds?: number[];

  @ApiPropertyOptional({
    type: [SessionExerciseDto],
    description: 'Ejercicios de fuerza con sus series, en orden.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => SessionExerciseDto)
  exercises?: SessionExerciseDto[];

  @ApiPropertyOptional({
    enum: EFFORTS,
    description: 'Esfuerzo percibido; ajusta la estimación de kcal.',
  })
  @IsOptional()
  @IsIn(EFFORTS)
  effort?: Effort;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
