import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class RequestFriendshipDto {
  @ApiProperty({
    example: 'AB23CD45',
    description: 'El código de amigo del jugador al que se pide amistad.',
  })
  @IsString()
  @Length(8, 8)
  // Mayúsculas y sin espacios: un código se transcribe a mano desde un
  // mensaje, y la diferencia entre "ab23cd45" y "AB23CD45" no debería
  // importar — el alfabeto de `generateFriendCode` ya es todo mayúsculas.
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  code!: string;
}
