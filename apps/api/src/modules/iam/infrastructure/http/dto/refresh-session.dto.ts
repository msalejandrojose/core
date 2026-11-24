import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RefreshSessionDto {
  @ApiProperty({ description: 'Refresh token recibido al iniciar sesión o en el último refresco.' })
  @IsString()
  @MinLength(20)
  @MaxLength(128)
  refreshToken!: string;
}
