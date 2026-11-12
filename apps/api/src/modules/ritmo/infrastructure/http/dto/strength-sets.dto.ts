import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import type { StrengthSet } from '../../../domain/entities/performance.entity';

export class StrengthSetDto {
  @ApiProperty({
    example: 72.5,
    description: 'Carga externa en kg (0 = peso corporal).',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000)
  weightKg!: number;

  @ApiProperty({ example: 8, minimum: 1, maximum: 200 })
  @IsInt()
  @Min(1)
  @Max(200)
  reps!: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Repeticiones en reserva (0–10).',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  rir?: number;

  @ApiPropertyOptional({
    example: 120,
    description: 'Descanso previo, en segundos.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3600)
  restSec?: number;

  @ApiPropertyOptional({
    description: 'Calentamiento: no cuenta para volumen ni marcas.',
  })
  @IsOptional()
  @IsBoolean()
  isWarmup?: boolean;
}

export class SessionExerciseDto {
  @ApiProperty({ description: 'Ejercicio del catálogo (o propio).' })
  @IsUUID()
  exerciseId!: string;

  @ApiProperty({ type: [StrengthSetDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => StrengthSetDto)
  sets!: StrengthSetDto[];
}

export class ReplaceSetsDto {
  @ApiProperty({
    type: [SessionExerciseDto],
    description: 'Ejercicios en el orden en que se hicieron.',
  })
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => SessionExerciseDto)
  exercises!: SessionExerciseDto[];
}

/** Aplana ejercicios→series y fija el orden: lo decide el servidor, no el cliente. */
export function flattenSets(
  exercises: SessionExerciseDto[] | undefined,
): StrengthSet[] {
  return (exercises ?? []).flatMap((ex, exerciseOrder) =>
    ex.sets.map((s, setOrder) => ({
      exerciseId: ex.exerciseId,
      exerciseOrder,
      setOrder,
      weightKg: s.weightKg,
      reps: s.reps,
      rir: s.rir ?? null,
      restSec: s.restSec ?? null,
      isWarmup: s.isWarmup ?? false,
    })),
  );
}
