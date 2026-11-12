import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  ActivitySession,
  ActivitySource,
  Effort,
} from '../../../domain/entities/activity-session.entity';
import type {
  ActivityKind,
  StrengthSet,
} from '../../../domain/entities/performance.entity';

export class ActivitySessionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() activityTypeId: string;
  @ApiProperty({ example: 'Correr' }) activityTypeName: string;
  @ApiProperty() startedAt: Date;
  @ApiProperty({ example: '2026-11-10' }) loggedOn: string;
  @ApiProperty({ example: 1800 }) durationSec: number;
  @ApiPropertyOptional({ example: 5200 }) distanceM: number | null;
  @ApiPropertyOptional({ example: 148 }) avgHeartRate: number | null;
  @ApiPropertyOptional({ example: 176 }) maxHeartRate: number | null;
  @ApiPropertyOptional({ example: 140 }) elevationGainM: number | null;
  @ApiPropertyOptional({ example: 172 }) cadence: number | null;
  @ApiPropertyOptional({ example: 7, description: 'CR10 (1–10).' })
  rpe: number | null;
  @ApiPropertyOptional({ type: [Number], description: 'Segundos en Z1..Z5.' })
  zoneSeconds: number[] | null;
  @ApiProperty({
    example: 'RUN',
    description: 'Disciplina del tipo de actividad.',
  })
  kind: ActivityKind;
  @ApiProperty({ description: 'Series de fuerza, en orden. Vacío en cardio.' })
  sets: StrengthSet[];
  @ApiPropertyOptional({ enum: ['LIGHT', 'MODERATE', 'VIGOROUS'] })
  effort: Effort | null;
  @ApiProperty({
    example: 336,
    description: 'kcal estimadas al registrar (snapshot, no se recalcula).',
  })
  kcalBurned: number;
  @ApiPropertyOptional() notes: string | null;
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
