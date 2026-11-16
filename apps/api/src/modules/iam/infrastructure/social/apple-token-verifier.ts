import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SocialAuthFailedError } from '../../domain/errors/social-auth-failed.error';
import type { SocialProfile } from '../../application/dto/social-profile';
import type { AppleTokenVerifierPort } from '../../application/ports/apple-token-verifier.port';
import {
  AppleTokenError,
  tokenKeyId,
  verifyAppleIdentityToken,
  type AppleJwk,
} from './apple-identity-token';

const KEYS_URL = 'https://appleid.apple.com/auth/keys';
const KEYS_TTL_MS = 60 * 60 * 1000;
/** Bundle id de la app iOS: el `aud` de los tokens nativos. */
const DEFAULT_AUDIENCE = 'es.aj.brio';

/**
 * Sign in with Apple: comprueba la firma del identity token con las claves
 * públicas de Apple (cacheadas una hora; si llega un `kid` nuevo, se vuelven a
 * pedir) y que el token es para esta app.
 */
@Injectable()
export class AppleTokenVerifier implements AppleTokenVerifierPort {
  private readonly logger = new Logger(AppleTokenVerifier.name);
  private keys: AppleJwk[] = [];
  private fetchedAt = 0;

  constructor(private readonly config: ConfigService) {}

  async verify(identityToken: string): Promise<SocialProfile> {
    try {
      const kid = tokenKeyId(identityToken);
      const keys = await this.keysFor(kid);
      const claims = verifyAppleIdentityToken(identityToken, keys, {
        audiences: this.audiences(),
      });
      return {
        providerId: claims.sub,
        // Con «Ocultar mi correo» es una dirección @privaterelay.appleid.com: vale igual.
        email: claims.email?.toLowerCase() ?? null,
        firstName: null,
        lastName: null,
        avatarUrl: null,
      };
    } catch (err) {
      if (err instanceof AppleTokenError)
        this.logger.warn(`Token de Apple rechazado: ${err.problem}`);
      else this.logger.error(`No se pudo verificar con Apple: ${String(err)}`);
      throw new SocialAuthFailedError('apple');
    }
  }

  private async keysFor(kid: string): Promise<AppleJwk[]> {
    const fresh = Date.now() - this.fetchedAt < KEYS_TTL_MS;
    if (fresh && this.keys.some((k) => k.kid === kid)) return this.keys;
    const res = await fetch(KEYS_URL, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`Apple respondió ${res.status}`);
    const body = (await res.json()) as { keys?: AppleJwk[] };
    this.keys = body.keys ?? [];
    this.fetchedAt = Date.now();
    return this.keys;
  }

  // `APPLE_CLIENT_ID` admite varios separados por comas (bundle id de iOS y,
  // si algún día hay login web, el Services ID).
  private audiences(): string[] {
    const raw = this.config.get<string>('APPLE_CLIENT_ID') ?? DEFAULT_AUDIENCE;
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
}
