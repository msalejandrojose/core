import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SocialAuthFailedError } from '../../domain/errors/social-auth-failed.error';
import type { SocialProfile } from '../../application/dto/social-profile';
import type { PlayGamesAuthVerifierPort } from '../../application/ports/play-games-auth-verifier.port';

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface PlayGamesPlayer {
  playerId?: string;
  displayName?: string;
  avatarImageUrl?: string;
}

// Ni Play Games da el email del jugador de forma fiable (v2 no soporta pedir
// scopes adicionales de forma consistente, ver plan). Se sintetiza un email de
// relleno con el TLD reservado por RFC 2606 para direcciones que nunca deben
// resolver — así el alta de cuenta nueva no depende de tener un email real.
function placeholderEmail(playerId: string): string {
  return `play-games-${playerId}@accounts.invalid`;
}

// Canjea el `serverAuthCode` de Play Games Services v2
// (`requestServerSideAccess()` en el cliente) por el perfil del jugador:
// 1. Canje de código por access_token contra el token endpoint de Google —
//    mismo endpoint que `GoogleAuthCodeExchanger`, pero con las credenciales
//    del cliente OAuth "Web application" registrado para el SERVIDOR del
//    juego (no el del cliente Android), y `redirect_uri` vacío: no hay
//    redirect de navegador en este flujo, es SDK nativo → servidor directo.
// 2. `games/v1/players/me` con ese access_token para el playerId real.
@Injectable()
export class PlayGamesAuthVerifier implements PlayGamesAuthVerifierPort {
  private readonly logger = new Logger(PlayGamesAuthVerifier.name);

  constructor(private readonly config: ConfigService) {}

  async verify(serverAuthCode: string): Promise<SocialProfile> {
    const clientId = this.config.get<string>(
      'GOOGLE_PLAY_GAMES_SERVER_CLIENT_ID',
    );
    const clientSecret = this.config.get<string>(
      'GOOGLE_PLAY_GAMES_SERVER_CLIENT_SECRET',
    );

    if (!clientId || !clientSecret) {
      this.logger.error(
        'GOOGLE_PLAY_GAMES_SERVER_CLIENT_ID/CLIENT_SECRET no configurados — no se puede canjear el serverAuthCode.',
      );
      throw new SocialAuthFailedError('play_games');
    }

    const accessToken = await this.exchangeForAccessToken(
      serverAuthCode,
      clientId,
      clientSecret,
    );
    const player = await this.fetchPlayer(accessToken);

    if (!player.playerId) {
      throw new SocialAuthFailedError('play_games');
    }

    return {
      providerId: player.playerId,
      email: placeholderEmail(player.playerId),
      firstName: player.displayName ?? null,
      lastName: null,
      avatarUrl: player.avatarImageUrl ?? null,
    };
  }

  private async exchangeForAccessToken(
    code: string,
    clientId: string,
    clientSecret: string,
  ): Promise<string> {
    let res: Response;
    try {
      res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          // Sin redirect_uri: `requestServerSideAccess()` no pasa por un
          // navegador, así que no hay URI de retorno que validar.
          redirect_uri: '',
          grant_type: 'authorization_code',
        }).toString(),
      });
    } catch (err) {
      this.logger.error(`No se pudo contactar con Google: ${String(err)}`);
      throw new SocialAuthFailedError('play_games');
    }

    const data = (await res.json().catch(() => null)) as GoogleTokenResponse | null;

    if (!res.ok || !data?.access_token) {
      this.logger.warn(
        `Canje de serverAuthCode de Play Games fallido: ${data?.error ?? res.status} ${data?.error_description ?? ''}`,
      );
      throw new SocialAuthFailedError('play_games');
    }

    return data.access_token;
  }

  private async fetchPlayer(accessToken: string): Promise<PlayGamesPlayer> {
    let res: Response;
    try {
      res = await fetch('https://www.googleapis.com/games/v1/players/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (err) {
      this.logger.error(`No se pudo contactar con Play Games: ${String(err)}`);
      throw new SocialAuthFailedError('play_games');
    }

    if (!res.ok) {
      throw new SocialAuthFailedError('play_games');
    }

    return (await res.json()) as PlayGamesPlayer;
  }
}
