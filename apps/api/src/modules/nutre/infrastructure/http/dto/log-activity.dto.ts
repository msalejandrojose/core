import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
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
