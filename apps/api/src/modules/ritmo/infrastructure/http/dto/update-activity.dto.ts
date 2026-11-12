import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import type { Effort } from '../../../domain/entities/activity-session.entity';

const EFFORTS: Effort[] = ['LIGHT', 'MODERATE', 'VIGOROUS'];
const MAX_DURATION_SEC = 12 * 60 * 60;
/** Valida solo si viene con valor: `null` significa «vaciar el campo». */
const notNull = (_: unknown, value: unknown) => value !== null;

/**
 * Edición parcial: lo que no se manda no se toca, y `null` vacía un campo
 * opcional (distancia, pulsaciones, RPE…).
 */
export class UpdateActivityDto {
  @ApiPropertyOptional({ example: '2026-11-10T07:30:00.000Z' })
  @IsOptional()
  @IsISO8601()
  startedAt?: string;

  @ApiPropertyOptional({ example: 1800, minimum: 1, maximum: MAX_DURATION_SEC })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_DURATION_SEC)
  durationSec?: number;

  @ApiPropertyOptional({ example: 5200, nullable: true })
  @IsOptional()
  @ValidateIf(notNull)
  @IsInt()
  @Min(0)
  distanceM?: number | null;

  @ApiPropertyOptional({ example: 148, nullable: true })
  @IsOptional()
  @ValidateIf(notNull)
  @IsInt()
  @Min(30)
  @Max(250)
  avgHeartRate?: number | null;

  @ApiPropertyOptional({ example: 176, nullable: true })
  @IsOptional()
  @ValidateIf(notNull)
  @IsInt()
  @Min(30)
  @Max(250)
  maxHeartRate?: number | null;

  @ApiPropertyOptional({ example: 140, nullable: true })
  @IsOptional()
  @ValidateIf(notNull)
  @IsInt()
  @Min(0)
  @Max(20000)
  elevationGainM?: number | null;

  @ApiPropertyOptional({ example: 172, nullable: true })
  @IsOptional()
  @ValidateIf(notNull)
  @IsInt()
  @Min(1)
  @Max(300)
  cadence?: number | null;

  @ApiPropertyOptional({
    example: 7,
    nullable: true,
    description: 'CR10 (1–10).',
  })
  @IsOptional()
  @ValidateIf(notNull)
  @IsInt()
  @Min(1)
  @Max(10)
  rpe?: number | null;

  @ApiPropertyOptional({ example: [300, 1200, 600, 240, 60], nullable: true })
  @IsOptional()
  @ValidateIf(notNull)
  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(5)
  @IsInt({ each: true })
  @Min(0, { each: true })
  zoneSeconds?: number[] | null;

  @ApiPropertyOptional({ enum: EFFORTS, nullable: true })
  @IsOptional()
  @ValidateIf(notNull)
  @IsIn(EFFORTS)
  effort?: Effort | null;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @ValidateIf(notNull)
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class ListActivitiesQueryDto {
  @ApiPropertyOptional({
    example: '2026-11-10T07:30:00.000Z',
    description:
      'Cursor: solo entrenos que empezaron antes de este instante (el startedAt del último recibido).',
  })
  @IsOptional()
  @IsISO8601()
  before?: string;

  @ApiPropertyOptional({ default: 30, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
