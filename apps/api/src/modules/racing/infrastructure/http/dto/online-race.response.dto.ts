import { ApiProperty } from '@nestjs/swagger';
import { OnlineRace } from '../../../domain/entities/online-race.entity';
import { RacingCoinSource } from '../../../domain/entities/racing-wallet.entity';
import { RacingCoinReward } from '../../../domain/racing-coin-rewards';

export class OnlineRaceParticipantResponseDto {
  @ApiProperty({ enum: ['PLAYER', 'TARGET', 'THREAT'] })
  role!: 'PLAYER' | 'TARGET' | 'THREAT';

  @ApiProperty()
  userId!: string;

  @ApiProperty({ example: 42350 })
  durationMs!: number;

  @ApiProperty({ example: 1, description: 'Puesto en esta carrera: 1, 2 o 3.' })
  position!: number;

  @ApiProperty({
    example: 0,
    description: 'Diferencia contra el ganador, en ms. 0 para quien gana.',
  })
  deltaMs!: number;
}

export class CoinRewardResponseDto {
  @ApiProperty({ example: 100 })
  amount!: number;

  @ApiProperty({ enum: RacingCoinSource })
  source!: RacingCoinSource;
}

export class OnlineRaceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  trackId!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({
    type: [OnlineRaceParticipantResponseDto],
    description: 'Ordenados por posición: el podio, tal cual se guardó.',
  })
  participants!: OnlineRaceParticipantResponseDto[];

  @ApiProperty({
    type: [CoinRewardResponseDto],
    description:
      'Monedas ganadas en ESTA llamada (posición + amigo + racha, hasta 3 a la vez). Vacío al releer una carrera ya jugada — los bonos solo se acreditan una vez, al registrarla.',
  })
  coinsEarned!: CoinRewardResponseDto[];

  // `coinsEarned` solo se conoce en el momento de registrar la carrera
  // (TASK-287) — releerla más tarde (`GET /online-races/:id`) no vuelve a
  // calcular nada, así que aquí siempre va vacío.
  static fromRace(race: OnlineRace): OnlineRaceResponseDto {
    return OnlineRaceResponseDto.fromResult(race, []);
  }

  static fromResult(
    race: OnlineRace,
    coinsEarned: RacingCoinReward[],
  ): OnlineRaceResponseDto {
    const dto = new OnlineRaceResponseDto();
    dto.id = race.id;
    dto.trackId = race.trackId;
    dto.createdAt = race.createdAt;
    dto.participants = race.participants.map((p) => ({
      role: p.role,
      userId: p.userId,
      durationMs: p.durationMs,
      position: p.position,
      deltaMs: p.deltaMs,
    }));
    dto.coinsEarned = coinsEarned.map((c) => ({
      amount: c.amount,
      source: c.source,
    }));
    return dto;
  }
}
