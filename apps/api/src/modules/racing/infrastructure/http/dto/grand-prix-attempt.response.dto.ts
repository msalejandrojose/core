import { ApiProperty } from '@nestjs/swagger';
import { GrandPrixAttempt } from '../../../domain/entities/grand-prix-attempt.entity';
import { GrandPrix } from '../../../domain/entities/grand-prix.entity';

export class GrandPrixStageResultDto {
  @ApiProperty() trackId!: string;
  @ApiProperty({ example: 38420 }) durationMs!: number;
  @ApiProperty() completedAt!: Date;
}

export class GrandPrixAttemptResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() grandPrixId!: string;
  @ApiProperty({ enum: ['IN_PROGRESS', 'COMPLETED'] }) status!: string;
  @ApiProperty({
    nullable: true,
    example: 98420,
    description: 'Suma de las mangas ya corridas. Solo se fija al completar.',
  })
  totalDurationMs!: number | null;
  @ApiProperty({ type: [GrandPrixStageResultDto] })
  results!: GrandPrixStageResultDto[];
  @ApiProperty({
    nullable: true,
    description:
      'Id del circuito de la siguiente manga pendiente. Null si el intento ya está COMPLETED.',
  })
  nextTrackId!: string | null;
  @ApiProperty() startedAt!: Date;
  @ApiProperty({ nullable: true }) completedAt!: Date | null;

  // Se le pasa el Grand Prix además del intento porque `nextTrackId` no es un
  // dato propio del intento — es "qué manga toca" comparando sus resultados
  // contra el orden fijado por el Grand Prix.
  static fromDomain(
    attempt: GrandPrixAttempt,
    grandPrix: GrandPrix,
  ): GrandPrixAttemptResponseDto {
    const completedTrackIds = new Set(attempt.results.map((r) => r.trackId));
    const nextStage = grandPrix.stages.find(
      (s) => !completedTrackIds.has(s.trackId),
    );

    const dto = new GrandPrixAttemptResponseDto();
    dto.id = attempt.id;
    dto.grandPrixId = attempt.grandPrixId;
    dto.status = attempt.status;
    dto.totalDurationMs = attempt.totalDurationMs;
    dto.results = attempt.results.map((r) => ({
      trackId: r.trackId,
      durationMs: r.durationMs,
      completedAt: r.completedAt,
    }));
    dto.nextTrackId = nextStage?.trackId ?? null;
    dto.startedAt = attempt.startedAt;
    dto.completedAt = attempt.completedAt;
    return dto;
  }
}
