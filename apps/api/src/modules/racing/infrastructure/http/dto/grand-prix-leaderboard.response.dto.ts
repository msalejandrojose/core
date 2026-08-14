import { ApiProperty } from '@nestjs/swagger';
import { GrandPrixLeaderboardEntry } from '../../../domain/entities/grand-prix-leaderboard-entry.entity';

export class GrandPrixLeaderboardEntryDto {
  @ApiProperty({ example: 1 }) position!: number;
  @ApiProperty() userId!: string;
  @ApiProperty({ example: 'Alejandro' }) displayName!: string;
  @ApiProperty({ example: 98420 }) totalDurationMs!: number;
  @ApiProperty() completedAt!: Date;

  static fromEntry(
    entry: GrandPrixLeaderboardEntry,
  ): GrandPrixLeaderboardEntryDto {
    return {
      position: entry.position,
      userId: entry.userId,
      displayName: entry.displayName,
      totalDurationMs: entry.totalDurationMs,
      completedAt: entry.completedAt,
    };
  }
}

export class GrandPrixLeaderboardResponseDto {
  @ApiProperty({ type: [GrandPrixLeaderboardEntryDto] })
  entries!: GrandPrixLeaderboardEntryDto[];

  @ApiProperty({
    example: 12,
    nullable: true,
    description:
      'Posición de quien consulta, aunque quede fuera del top devuelto. Null si aún no ha completado ninguno.',
  })
  yourPosition!: number | null;
}
