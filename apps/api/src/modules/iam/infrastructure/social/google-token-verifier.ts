import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SocialAuthFailedError } from '../../domain/errors/social-auth-failed.error';
import type { SocialProfile } from '../../application/dto/social-profile';
import type { GoogleTokenVerifierPort } from '../../application/ports/google-token-verifier.port';

interface GoogleTokenInfo {
  iss: string;
  aud: string;
  sub: string;
  email?: string;
  email_verified?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  error_description?: string;
}

const VALID_ISSUERS = new Set([
  'accounts.google.com',
  'https://accounts.google.com',
]);

// Verifica el ID token contra el endpoint `tokeninfo` de Google en vez de
// validar la firma JWT localmente: evita depender de `google-auth-library`
// (y de mantener el JWKS de Google cacheado) a cambio de una llamada HTTP por
// login. Google recomienda esto para volúmenes bajos/medios de tráfico.
@Injectable()
export class GoogleTokenVerifier implements GoogleTokenVerifierPort {
  private readonly logger = new Logger(GoogleTokenVerifier.name);

  constructor(private readonly config: ConfigService) {}

  async verify(idToken: string): Promise<SocialProfile> {
    let res: Response;
    try {
      res = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      );
    } catch (err) {
      this.logger.error(`No se pudo contactar con Google: ${String(err)}`);
      throw new SocialAuthFailedError('google');
    }

    if (!res.ok) {
      throw new SocialAuthFailedError('google');
    }

    const info = (await res.json()) as GoogleTokenInfo;

    if (!VALID_ISSUERS.has(info.iss)) {
      throw new SocialAuthFailedError('google');
    }

    const allowedAudiences = this.allowedAudiences();
    if (allowedAudiences.length > 0 && !allowedAudiences.includes(info.aud)) {
      this.logger.warn(`Google ID token con audiencia inesperada: ${info.aud}`);
      throw new SocialAuthFailedError('google');
    }

    return {
      providerId: info.sub,
      email: info.email ?? null,
      firstName: info.given_name ?? null,
      lastName: info.family_name ?? null,
      avatarUrl: info.picture ?? null,
    };
  }

  // `GOOGLE_CLIENT_ID` admite una lista separada por comas: la app móvil suele
  // registrar client IDs distintos para iOS/Android/Web bajo el mismo proyecto.
  private allowedAudiences(): string[] {
    const raw = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!raw) return [];
    return raw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }
}
