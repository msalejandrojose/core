import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token de reset enviado por email.' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ description: 'Nueva contraseña (mínimo 8 caracteres).' })
  @IsString()
  @MinLength(8)
  password!: string;
}
