import { ApiProperty } from '@nestjs/swagger';
import { LapTime } from '../../../domain/entities/lap-time.entity';

export class LapTimeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 42350 })
  durationMs!: number;

  @ApiProperty({ example: [10120, 21400, 33900, 42350], type: [Number] })
  splitsMs!: number[];

  @ApiProperty()
  createdAt!: Date;

  static fromLapTime(lap: LapTime): LapTimeResponseDto {
    return {
      id: lap.id,
      durationMs: lap.durationMs,
      splitsMs: lap.splitsMs,
      createdAt: lap.createdAt,
    };
  }
}

export class SubmitLapTimeResponseDto {
  @ApiProperty({ type: LapTimeResponseDto })
  lapTime!: LapTimeResponseDto;

  @ApiProperty({
    example: true,
    description: 'Si este intento ha mejorado la marca propia del jugador.',
  })
  personalBest!: boolean;

  @ApiProperty({
    example: 12,
    nullable: true,
    description: 'Posición en el leaderboard tras guardar el intento.',
  })
  position!: number | null;
}
