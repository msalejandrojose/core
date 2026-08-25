import { ApiProperty } from '@nestjs/swagger';
import {
  UserRacingSummary,
  UserRacingTrackSummary,
} from '../../../application/use-cases/admin-get-user-racing-summary.use-case';
import { PlayerCarLoadoutResponseDto } from './player-car-loadout.response.dto';

export class UserRacingTrackSummaryDto {
  @ApiProperty() trackId!: string;
  @ApiProperty() trackSlug!: string;
  @ApiProperty() trackName!: string;
  @ApiProperty() attempts!: number;
  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Null si solo tiene intentos anulados en este circuito.',
  })
  bestDurationMs!: number | null;
  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Null si no tiene tiempo válido (bestDurationMs también null).',
  })
  position!: number | null;

  static fromDomain(
    summary: UserRacingTrackSummary,
  ): UserRacingTrackSummaryDto {
    const dto = new UserRacingTrackSummaryDto();
    dto.trackId = summary.trackId;
    dto.trackSlug = summary.trackSlug;
    dto.trackName = summary.trackName;
    dto.attempts = summary.attempts;
    dto.bestDurationMs = summary.bestDurationMs;
    dto.position = summary.position;
    return dto;
  }
}

export class UserRacingSummaryResponseDto {
  @ApiProperty() userId!: string;
  @ApiProperty() userEmail!: string;
  @ApiProperty() userDisplayName!: string;
  @ApiProperty({ type: [UserRacingTrackSummaryDto] })
  tracks!: UserRacingTrackSummaryDto[];
  @ApiProperty({
    type: PlayerCarLoadoutResponseDto,
    description:
      'Coche equipado ahora mismo. Sin datos de skin todavía — hueco reservado para cuando exista ese catálogo.',
  })
  loadout!: PlayerCarLoadoutResponseDto;

  static fromDomain(summary: UserRacingSummary): UserRacingSummaryResponseDto {
    const dto = new UserRacingSummaryResponseDto();
    dto.userId = summary.userId;
    dto.userEmail = summary.userEmail;
    dto.userDisplayName = summary.userDisplayName;
    dto.tracks = summary.tracks.map((t) =>
      UserRacingTrackSummaryDto.fromDomain(t),
    );
    dto.loadout = PlayerCarLoadoutResponseDto.fromDomain(summary.loadout);
    return dto;
  }
}
