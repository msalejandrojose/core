import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { GoogleAuthCodeExchangerPort } from '../../application/ports/google-auth-code-exchanger.port';
import { SocialAuthFailedError } from '../../domain/errors/social-auth-failed.error';

interface GoogleTokenResponse {
  id_token?: string;
  error?: string;
  error_description?: string;
}

// Flujo de servidor web de OAuth 2.0 (cliente confidencial): canjea el `code`
// que Google mandó al callback por un id_token, usando el client_secret. Es
// un endpoint distinto y una llamada distinta de `GoogleTokenVerifier`, que
// solo verifica un id_token que YA existe (el que manda el SDK nativo en
// login/registro directos).
@Injectable()
export class GoogleAuthCodeExchanger implements GoogleAuthCodeExchangerPort {
  private readonly logger = new Logger(GoogleAuthCodeExchanger.name);

  constructor(private readonly config: ConfigService) {}

  async exchange(code: string): Promise<string> {
    const clientId = this.config.get<string>('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_OAUTH_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('GOOGLE_OAUTH_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      this.logger.error(
        'GOOGLE_OAUTH_CLIENT_ID/CLIENT_SECRET/REDIRECT_URI no configurados — no se puede canjear el code.',
      );
      throw new SocialAuthFailedError('google');
    }

    let res: Response;
    try {
      res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }).toString(),
      });
    } catch (err) {
      this.logger.error(`No se pudo contactar con Google: ${String(err)}`);
      throw new SocialAuthFailedError('google');
    }

    const data = (await res.json().catch(() => null)) as GoogleTokenResponse | null;

    if (!res.ok || !data?.id_token) {
      this.logger.warn(
        `Canje de code de Google fallido: ${data?.error ?? res.status} ${data?.error_description ?? ''}`,
      );
      throw new SocialAuthFailedError('google');
    }

    return data.id_token;
  }
}
