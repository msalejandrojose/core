import { ApiProperty } from '@nestjs/swagger';
import { OnlineRace } from '../../../domain/entities/online-race.entity';

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

  static fromRace(race: OnlineRace): OnlineRaceResponseDto {
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
    return dto;
  }
}
