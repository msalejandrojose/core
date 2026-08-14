import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class SubmitGrandPrixStageResultDto {
  @ApiProperty({
    example: 42350,
    description: 'Tiempo de la manga en milisegundos enteros.',
  })
  @IsInt()
  @Min(1)
  durationMs!: number;
}
