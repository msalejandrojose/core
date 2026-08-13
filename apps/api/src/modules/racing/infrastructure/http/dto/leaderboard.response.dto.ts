import { ApiProperty } from '@nestjs/swagger';
import { LeaderboardEntry } from '../../../domain/entities/lap-time.entity';

export class LeaderboardEntryDto {
  @ApiProperty({ example: 1 })
  position!: number;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ example: 'Alejandro' })
  displayName!: string;

  @ApiProperty({ example: 38420 })
  durationMs!: number;

  @ApiProperty()
  achievedAt!: Date;

  static fromEntry(entry: LeaderboardEntry): LeaderboardEntryDto {
    return {
      position: entry.position,
      userId: entry.userId,
      displayName: entry.displayName,
      durationMs: entry.durationMs,
      achievedAt: entry.achievedAt,
    };
  }
}

export class LeaderboardResponseDto {
  @ApiProperty({ type: [LeaderboardEntryDto] })
  entries!: LeaderboardEntryDto[];

  @ApiProperty({
    example: 412,
    nullable: true,
    description:
      'Posición de quien consulta, aunque quede fuera del top devuelto. Null si aún no tiene tiempo.',
  })
  yourPosition!: number | null;
}
