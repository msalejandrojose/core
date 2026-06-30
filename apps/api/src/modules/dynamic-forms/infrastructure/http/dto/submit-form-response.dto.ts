import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class SubmitFormResponseDto {
  @ApiProperty({ description: 'Mapa fieldKey → value con las respuestas del formulario' })
  @IsNotEmpty()
  answers: Record<string, unknown>;
}
