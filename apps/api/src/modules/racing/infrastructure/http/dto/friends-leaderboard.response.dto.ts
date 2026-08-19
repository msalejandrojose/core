import { ApiProperty } from '@nestjs/swagger';
import { LeaderboardEntryDto } from './leaderboard.response.dto';

export class FriendsLeaderboardResponseDto {
  @ApiProperty({
    type: [LeaderboardEntryDto],
    description:
      'El jugador que consulta y sus amigos, uno por fila con su mejor marca — la posición es el puesto DENTRO de este grupo, no el global.',
  })
  entries!: LeaderboardEntryDto[];

  @ApiProperty({
    nullable: true,
    description: 'Misma semántica que en el leaderboard general (TASK-227).',
  })
  seasonId!: string | null;
}
