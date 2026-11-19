import { ACTIVITY_KINDS } from '../../../domain/entities/performance.entity';
import { ApiProperty } from '@nestjs/swagger';
import type {
  ActivitySession,
  ActivitySource,
  Effort,
} from '../../../domain/entities/activity-session.entity';
import type {
  ActivityKind,
  StrengthSet,
} from '../../../domain/entities/performance.entity';

/** Una serie de fuerza tal como la devuelve la API. */
export class StrengthSetResponseDto {
  @ApiProperty({ format: 'uuid' }) exerciseId!: string;
  @ApiProperty({ example: 0 }) exerciseOrder!: number;
  @ApiProperty({ example: 1 }) setOrder!: number;
  @ApiProperty({
    example: 80,
    description: 'Carga externa en kg (0 = solo peso corporal).',
  })
  weightKg!: number;
  @ApiProperty({ example: 8 }) reps!: number;
  @ApiProperty({ type: Number, nullable: true, example: 2 }) rir!:
    | number
    | null;
  @ApiProperty({ type: Number, nullable: true, example: 120 })
  restSec!: number | null;
  @ApiProperty() isWarmup!: boolean;
}

export class ActivitySessionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() activityTypeId: string;
  @ApiProperty({ example: 'Correr' }) activityTypeName: string;
  @ApiProperty({ type: String, format: 'date-time' }) startedAt: Date;
  @ApiProperty({ example: '2026-11-10' }) loggedOn: string;
  @ApiProperty({ example: 1800 }) durationSec: number;
  @ApiProperty({ type: Number, nullable: true, example: 5200 })
  distanceM: number | null;
  @ApiProperty({ type: Number, nullable: true, example: 148 })
  avgHeartRate: number | null;
  @ApiProperty({ type: Number, nullable: true, example: 176 })
  maxHeartRate: number | null;
  @ApiProperty({ type: Number, nullable: true, example: 140 })
  elevationGainM: number | null;
  @ApiProperty({ type: Number, nullable: true, example: 172 }) cadence:
    | number
    | null;
  @ApiProperty({
    type: Number,
    nullable: true,
    example: 7,
    description: 'CR10 (1–10).',
  })
  rpe: number | null;
  @ApiProperty({
    nullable: true,
    type: [Number],
    description: 'Segundos en Z1..Z5.',
  })
  zoneSeconds: number[] | null;
  @ApiProperty({
    enum: ACTIVITY_KINDS,
    example: 'RUN',
    description: 'Disciplina del tipo de actividad.',
  })
  kind: ActivityKind;
  @ApiProperty({
    type: () => [StrengthSetResponseDto],
    description: 'Series de fuerza, en orden. Vacío en cardio.',
  })
  sets: StrengthSet[];
  @ApiProperty({
    nullable: true,
    enum: ['LIGHT', 'MODERATE', 'VIGOROUS'],
  })
  effort: Effort | null;
  @ApiProperty({
    example: 336,
    description: 'kcal estimadas al registrar (snapshot, no se recalcula).',
  })
  kcalBurned: number;
  @ApiProperty({ type: String, nullable: true }) notes: string | null;
  @ApiProperty({
    enum: ['MANUAL', 'HEALTHKIT', 'GOOGLE_FIT', 'STRAVA', 'GARMIN'],
    description: 'Origen del registro.',
  })
  source: ActivitySource;

  static from(s: ActivitySession): ActivitySessionResponseDto {
    const dto = new ActivitySessionResponseDto();
    dto.id = s.id;
    dto.activityTypeId = s.activityTypeId;
    dto.activityTypeName = s.activityTypeName;
    dto.startedAt = s.startedAt;
    dto.loggedOn = s.loggedOn;
    dto.durationSec = s.durationSec;
    dto.distanceM = s.distanceM;
    dto.avgHeartRate = s.avgHeartRate;
    dto.maxHeartRate = s.maxHeartRate;
    dto.elevationGainM = s.elevationGainM;
    dto.cadence = s.cadence;
    dto.rpe = s.rpe;
    dto.zoneSeconds = s.zoneSeconds;
    dto.kind = s.kind;
    dto.sets = s.sets;
    dto.effort = s.effort;
    dto.kcalBurned = s.kcalBurned;
    dto.notes = s.notes;
    dto.source = s.source;
    return dto;
  }
}
