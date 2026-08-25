import { ApiProperty } from '@nestjs/swagger';
import { OnlineRaceRivalCandidate } from '../../../domain/resolve-online-race-rivals';
import { OnlineRaceMatch } from '../../../application/use-cases/match-online-race.use-case';
import { GhostSnapshotDto } from './ghost-snapshot.dto';

export class OnlineRaceRivalDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty({ example: 42350 })
  durationMs!: number;

  @ApiProperty({ type: [GhostSnapshotDto] })
  snapshots!: GhostSnapshotDto[];

  static fromCandidate(
    candidate: OnlineRaceRivalCandidate,
  ): OnlineRaceRivalDto {
    const dto = new OnlineRaceRivalDto();
    dto.userId = candidate.userId;
    dto.durationMs = candidate.durationMs;
    dto.snapshots = candidate.snapshots;
    return dto;
  }
}

export class OnlineRaceMatchResponseDto {
  @ApiProperty()
  trackId!: string;

  @ApiProperty({
    type: OnlineRaceRivalDto,
    nullable: true,
    description:
      'Objetivo: ligeramente mejor que tú, o tu propio fantasma si ya vas primero. Null solo si ni eso hay (tu propia marca tampoco tiene fantasma).',
  })
  target!: OnlineRaceRivalDto | null;

  @ApiProperty({
    type: OnlineRaceRivalDto,
    nullable: true,
    description: 'Amenaza: ligeramente peor que tú. Null si nadie va peor.',
  })
  threat!: OnlineRaceRivalDto | null;

  static fromMatch(match: OnlineRaceMatch): OnlineRaceMatchResponseDto {
    const dto = new OnlineRaceMatchResponseDto();
    dto.trackId = match.trackId;
    dto.target = match.target
      ? OnlineRaceRivalDto.fromCandidate(match.target)
      : null;
    dto.threat = match.threat
      ? OnlineRaceRivalDto.fromCandidate(match.threat)
      : null;
    return dto;
  }
}
