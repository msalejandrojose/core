import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { GhostSnapshotDto } from './ghost-snapshot.dto';

export class SubmitLapTimeDto {
  @ApiProperty({
    example: 42350,
    description: 'Tiempo total de la vuelta en milisegundos enteros.',
  })
  @IsInt()
  @Min(1)
  durationMs!: number;

  @ApiProperty({
    example: [10120, 21400, 33900, 42350],
    description:
      'Splits acumulados por sector, en ms. Crecientes, y el último igual a durationMs.',
    type: [Number],
  })
  @IsArray()
  // El tope alto es solo una barrera contra payloads absurdos; el número exacto
  // de sectores lo valida el dominio contra el circuito.
  @ArrayMinSize(1)
  @ArrayMaxSize(64)
  @IsInt({ each: true })
  @Min(1, { each: true })
  splitsMs!: number[];

  @ApiProperty({
    example: '0.1.0',
    description:
      'Versión del build que generó el tiempo. Permite invalidar marcas cuando cambia la física.',
  })
  @IsString()
  @Length(1, 32)
  clientVersion!: string;

  @ApiPropertyOptional({
    type: [GhostSnapshotDto],
    description:
      'Instantáneas de la vuelta para reproducirla como fantasma (TASK-220/221). Solo hace falta mandarlo cuando el cliente sabe que bate su marca local — el servidor lo descarta igualmente si no resulta ser la mejor marca del jugador.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GhostSnapshotDto)
  ghostSnapshots?: GhostSnapshotDto[];
}
