import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  MUSCLES,
  type Muscle,
  type PerfMetric,
  type PerfOrigin,
  type ZoneMethod,
} from '../../../domain/entities/performance.entity';

const WEIGHTS = [1, 0.5, 0.25];
const METHODS: ZoneMethod[] = ['MAX_HR', 'HR_RESERVE', 'CUSTOM'];
const METRICS: PerfMetric[] = ['VO2MAX', 'LACTATE_THRESHOLD_PACE'];
const ORIGINS: PerfOrigin[] = ['LAB_TEST', 'DEVICE', 'FIELD_TEST'];

export class MuscleWeightDto {
  @ApiProperty({ enum: MUSCLES })
  @IsIn(MUSCLES as readonly string[])
  muscle!: Muscle;

  @ApiProperty({
    enum: WEIGHTS,
    description: '1 principal, 0.5 secundario, 0.25 indirecto.',
  })
  @IsIn(WEIGHTS)
  weight!: number;
}

export class CreateExerciseDto {
  @ApiProperty({ example: 'Press en máquina' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCompound?: boolean;

  @ApiPropertyOptional({
    description: 'Sin carga externa por defecto (dominadas, fondos).',
  })
  @IsOptional()
  @IsBoolean()
  isBodyweight?: boolean;

  @ApiProperty({ type: [MuscleWeightDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(15)
  @ValidateNested({ each: true })
  @Type(() => MuscleWeightDto)
  muscles!: MuscleWeightDto[];
}

export class SaveHeartConfigDto {
  @ApiPropertyOptional({ example: 188, description: 'FC máxima (ppm).' })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(240)
  maxHr?: number;

  @ApiPropertyOptional({ example: 52, description: 'FC en reposo (ppm).' })
  @IsOptional()
  @IsInt()
  @Min(25)
  @Max(120)
  restingHr?: number;

  @ApiProperty({ enum: METHODS })
  @IsIn(METHODS)
  method!: ZoneMethod;

  @ApiPropertyOptional({
    example: [120, 140, 158, 172],
    description: 'Límite superior en ppm de Z1..Z4. Solo con CUSTOM.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsInt({ each: true })
  @Min(40, { each: true })
  @Max(240, { each: true })
  customZones?: number[];
}

export class AddMeasurementDto {
  @ApiProperty({ enum: METRICS })
  @IsIn(METRICS)
  metric!: PerfMetric;

  @ApiProperty({
    example: 52,
    description: 'VO2max en ml/kg/min, o ritmo de umbral en segundos por km.',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(2000)
  value!: number;

  @ApiPropertyOptional({ example: 168, description: 'FC asociada (ppm).' })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(250)
  heartRate?: number;

  @ApiProperty({ enum: ORIGINS, description: 'De dónde sale el valor.' })
  @IsIn(ORIGINS)
  origin!: PerfOrigin;

  @ApiPropertyOptional({ example: 'Garmin Forerunner 265' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  sourceLabel?: string;

  @ApiProperty({ example: '2026-11-10' })
  @IsISO8601({ strict: true })
  measuredOn!: string;
}
