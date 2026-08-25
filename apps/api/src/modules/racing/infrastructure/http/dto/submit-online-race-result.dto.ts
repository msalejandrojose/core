import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class OnlineRaceRivalDto {
  @ApiProperty({
    enum: ['TARGET', 'THREAT'],
    description:
      'TARGET (objetivo, ligeramente mejor) o THREAT (amenaza, ligeramente peor) — el que devolvió el emparejamiento (TASK-284).',
  })
  @IsIn(['TARGET', 'THREAT'])
  role!: 'TARGET' | 'THREAT';

  @ApiProperty({
    description: 'De quién es el fantasma contra el que se corrió.',
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
    example: 42350,
    description: 'El tiempo del propio jugador en esta carrera.',
  })
  @IsInt()
  @Min(1)
  durationMs!: number;

  @ApiPropertyOptional({
    type: [OnlineRaceRivalDto],
    description:
      'Hasta 2 rivales (objetivo/amenaza) contra los que se corrió, tal como los devolvió el emparejamiento. Sin ninguno si la carrera se corrió en solitario (p.ej. sin rivales disponibles).',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => OnlineRaceRivalDto)
  rivals?: OnlineRaceRivalDto[];
}
