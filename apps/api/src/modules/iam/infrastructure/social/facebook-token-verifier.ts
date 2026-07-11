import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SocialAuthFailedError } from '../../domain/errors/social-auth-failed.error';
import type { SocialProfile } from '../../application/dto/social-profile';
import type { FacebookTokenVerifierPort } from '../../application/ports/facebook-token-verifier.port';

interface FacebookDebugTokenResponse {
  data?: {
    app_id?: string;
    is_valid?: boolean;
    user_id?: string;
  };
}

interface FacebookMeResponse {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  picture?: { data?: { url?: string } };
  error?: { message?: string };
}

const GRAPH_API_VERSION = 'v21.0';

// Verifica el access token de Facebook en dos pasos, siguiendo la recomendación
// de Meta: 1) `debug_token` con un app access token confirma que el token es
// válido y fue emitido para NUESTRA app (`app_id`); 2) `/me` recupera el perfil.
// Sin `google-auth-library`-equivalente aquí tampoco: solo `fetch` nativo.
@Injectable()
export class FacebookTokenVerifier implements FacebookTokenVerifierPort {
  private readonly logger = new Logger(FacebookTokenVerifier.name);

  constructor(private readonly config: ConfigService) {}

  async verify(accessToken: string): Promise<SocialProfile> {
    const appId = this.config.get<string>('FACEBOOK_APP_ID');
    const appSecret = this.config.get<string>('FACEBOOK_APP_SECRET');
    if (!appId || !appSecret) {
      this.logger.error(
        'FACEBOOK_APP_ID / FACEBOOK_APP_SECRET no configurados.',
      );
      throw new SocialAuthFailedError('facebook');
    }

    await this.assertTokenBelongsToApp(accessToken, appId, appSecret);
    return this.fetchProfile(accessToken);
  }

  private async assertTokenBelongsToApp(
    accessToken: string,
    appId: string,
    appSecret: string,
  ): Promise<void> {
    const appAccessToken = `${appId}|${appSecret}`;
    const url =
      `https://graph.facebook.com/${GRAPH_API_VERSION}/debug_token` +
      `?input_token=${encodeURIComponent(accessToken)}` +
      `&access_token=${encodeURIComponent(appAccessToken)}`;

    let res: Response;
    try {
      res = await fetch(url);
    } catch (err) {
      this.logger.error(`No se pudo contactar con Facebook: ${String(err)}`);
      throw new SocialAuthFailedError('facebook');
    }

    if (!res.ok) {
      throw new SocialAuthFailedError('facebook');
    }

    const body = (await res.json()) as FacebookDebugTokenResponse;
    if (!body.data?.is_valid || body.data.app_id !== appId) {
      throw new SocialAuthFailedError('facebook');
    }
  }

  private async fetchProfile(accessToken: string): Promise<SocialProfile> {
    const url =
      `https://graph.facebook.com/${GRAPH_API_VERSION}/me` +
      `?fields=id,email,first_name,last_name,picture.type(large)` +
      `&access_token=${encodeURIComponent(accessToken)}`;

    let res: Response;
    try {
      res = await fetch(url);
    } catch (err) {
      this.logger.error(`No se pudo contactar con Facebook: ${String(err)}`);
      throw new SocialAuthFailedError('facebook');
    }

    const body = (await res.json()) as FacebookMeResponse;
    if (!res.ok || body.error || !body.id) {
      throw new SocialAuthFailedError('facebook');
    }

    return {
      providerId: body.id,
      email: body.email ?? null,
      firstName: body.first_name ?? null,
      lastName: body.last_name ?? null,
      avatarUrl: body.picture?.data?.url ?? null,
    };
  }
}
