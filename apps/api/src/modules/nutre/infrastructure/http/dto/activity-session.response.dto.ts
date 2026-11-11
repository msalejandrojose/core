import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  ActivitySession,
  ActivitySource,
  Effort,
} from '../../../domain/entities/activity-session.entity';

export class ActivitySessionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() activityTypeId: string;
  @ApiProperty({ example: 'Correr' }) activityTypeName: string;
  @ApiProperty() startedAt: Date;
  @ApiProperty({ example: '2026-11-10' }) loggedOn: string;
  @ApiProperty({ example: 1800 }) durationSec: number;
  @ApiPropertyOptional({ example: 5200 }) distanceM: number | null;
  @ApiPropertyOptional({ example: 148 }) avgHeartRate: number | null;
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
    dto.effort = s.effort;
    dto.kcalBurned = s.kcalBurned;
    dto.notes = s.notes;
    dto.source = s.source;
    return dto;
  }
}
