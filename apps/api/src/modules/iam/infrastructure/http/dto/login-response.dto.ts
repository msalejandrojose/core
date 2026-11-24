import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT a usar como `Authorization: Bearer <token>`' })
  accessToken!: string;

  @ApiPropertyOptional({
    description:
      'Refresh token de la sesión: se cambia en `POST /auth/refresh` por un par nuevo cuando el access token caduca. Rota en cada uso.',
  })
  refreshToken?: string;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}
