import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ description: 'Token de verificación enviado por email.' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
