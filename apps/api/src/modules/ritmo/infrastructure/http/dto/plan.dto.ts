import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  ACTIVITY_KINDS,
  type ActivityKind,
} from '../../../domain/entities/performance.entity';
import type { PlanLoad } from '../../../domain/entities/plan.entity';
import { DAY_EXAMPLE, DAY_PATTERN } from './day.param';

const LOADS: PlanLoad[] = ['REST', 'LOW', 'MEDIUM', 'HIGH'];
const notNull = (_: unknown, v: unknown) => v !== null;

export class SavePlanDto {
  @ApiProperty({ example: 'Media maratón de Valencia' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: '2027-03-22', nullable: true })
  @IsOptional()
  @ValidateIf(notNull)
  @Matches(DAY_PATTERN, { message: 'raceDate debe tener formato YYYY-MM-DD.' })
  raceDate?: string | null;

  @ApiPropertyOptional({ example: 21097, nullable: true })
  @IsOptional()
  @ValidateIf(notNull)
  @IsInt()
  @Min(100)
  @Max(1_000_000)
  raceDistanceM?: number | null;

  @ApiPropertyOptional({
    example: 6300,
    nullable: true,
    description: 'Tiempo objetivo en segundos.',
  })
  @IsOptional()
  @ValidateIf(notNull)
  @IsInt()
  @Min(60)
  @Max(360_000)
  targetTimeSec?: number | null;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @ValidateIf(notNull)
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

/**
 * Sesión de un día. Con `templateCode` se parte de la plantilla y el resto de
 * campos la ajustan; sin ella hacen falta `kind`, `title` y `load`.
 */
export class SetPlannedDayDto {
  @ApiPropertyOptional({
    example: 'series',
    description: 'Plantilla de partida.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  templateCode?: string;

  @ApiPropertyOptional({ enum: ACTIVITY_KINDS })
  @IsOptional()
  @IsIn(ACTIVITY_KINDS as readonly string[])
  kind?: ActivityKind;

  @ApiPropertyOptional({ example: 'Series 6 × 800 m' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ enum: LOADS })
  @IsOptional()
  @IsIn(LOADS)
  load?: PlanLoad;

  @ApiPropertyOptional({ example: '07:30', nullable: true })
  @IsOptional()
  @ValidateIf(notNull)
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime debe ser HH:MM.',
  })
  startTime?: string | null;

  @ApiPropertyOptional({ example: 55, nullable: true })
  @IsOptional()
  @ValidateIf(notNull)
  @IsInt()
  @Min(1)
  @Max(720)
  plannedDurationMin?: number | null;

  @ApiPropertyOptional({ example: 10000, nullable: true })
  @IsOptional()
  @ValidateIf(notNull)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  plannedDistanceM?: number | null;

  @ApiPropertyOptional({
    example: 270,
    nullable: true,
    description: 'Ritmo objetivo, s/km.',
  })
  @IsOptional()
  @ValidateIf(notNull)
  @IsInt()
  @Min(120)
  @Max(1200)
  targetPaceSecPerKm?: number | null;

  @ApiPropertyOptional({
    example: { reps: 6, repDistanceM: 800 },
    nullable: true,
  })
  @IsOptional()
  @ValidateIf(notNull)
  @IsObject()
  structure?: Record<string, unknown> | null;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @ValidateIf(notNull)
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class CompleteDayDto {
  @ApiProperty({ description: 'true = hecha; false = quitar el check.' })
  @IsBoolean()
  done!: boolean;

  @ApiPropertyOptional({ description: 'Con done=false: no la voy a hacer.' })
  @IsOptional()
  @IsBoolean()
  skipped?: boolean;

  @ApiPropertyOptional({
    description: 'Entreno real con el que se cumplió.',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf(notNull)
  @IsUUID()
  sessionId?: string | null;

  @ApiPropertyOptional({
    example: '8,2 km a 5:10, buenas sensaciones',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf(notNull)
  @IsString()
  @MaxLength(500)
  actualNotes?: string | null;
}

export class FillWeekDto {
  @ApiProperty({
    example: DAY_EXAMPLE,
    description: 'Cualquier día de la semana a rellenar.',
  })
  @Matches(DAY_PATTERN, { message: 'day debe tener formato YYYY-MM-DD.' })
  day!: string;

  @ApiProperty({ enum: ['TEMPLATE', 'COPY_PREVIOUS'] })
  @IsIn(['TEMPLATE', 'COPY_PREVIOUS'])
  mode!: 'TEMPLATE' | 'COPY_PREVIOUS';

  @ApiPropertyOptional({
    description: 'Sustituir también los días que ya tienen sesión.',
  })
  @IsOptional()
  @IsBoolean()
  replace?: boolean;
}
