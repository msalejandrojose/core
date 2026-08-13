import { ApiProperty } from '@nestjs/swagger';
import type { GoogleAuthSessionStart } from '../../../application/use-cases/start-google-auth-session.use-case';

export class GoogleAuthStartResponseDto {
  @ApiProperty({
    description: 'Id de la sesión de login: la app hace polling con este id.',
  })
  sessionId!: string;

  @ApiProperty({
    description:
      'URL de consentimiento de Google que la app debe abrir en el navegador del sistema.',
  })
  authUrl!: string;

  static from(start: GoogleAuthSessionStart): GoogleAuthStartResponseDto {
    const dto = new GoogleAuthStartResponseDto();
    dto.sessionId = start.sessionId;
    dto.authUrl = start.authUrl;
    return dto;
  }
}
