import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class OnlineRaceParticipantDto {
  @ApiProperty({
    enum: ['PLAYER', 'TARGET', 'THREAT'],
    description:
      'PLAYER es siempre quien sube la carrera. TARGET (objetivo) y THREAT ' +
      '(amenaza) son opcionales — el emparejamiento (TASK-284) decide si ' +
      'hay rival de cada tipo para esta carrera.',
  })
  @IsIn(['PLAYER', 'TARGET', 'THREAT'])
  role!: 'PLAYER' | 'TARGET' | 'THREAT';

  @ApiProperty({
    description:
      'De quién es este resultado: el propio jugador en PLAYER, o el rival ' +
      'cuyo fantasma se corrió en TARGET/THREAT.',
  })
  @IsString()
  userId!: string;

  @ApiProperty({ example: 42350 })
  @IsInt()
  @Min(1)
  durationMs!: number;
}

export class SubmitOnlineRaceResultDto {
  @ApiProperty({
    type: [OnlineRaceParticipantDto],
    description:
      'Entre 1 y 3 corredores: siempre el jugador, y hasta un objetivo y ' +
      'una amenaza.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => OnlineRaceParticipantDto)
  participants!: OnlineRaceParticipantDto[];
}
