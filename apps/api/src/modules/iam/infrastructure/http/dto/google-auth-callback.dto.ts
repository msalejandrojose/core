import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class GoogleAuthCallbackDto {
  @ApiProperty({ description: 'Authorization code devuelto por Google.' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({
    description: 'Valor anti-CSRF generado al iniciar la sesión.',
  })
  @IsString()
  @IsNotEmpty()
  state!: string;
}
