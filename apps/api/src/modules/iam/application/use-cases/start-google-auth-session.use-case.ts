import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GOOGLE_AUTH_SESSION_REPOSITORY,
  type GoogleAuthSessionRepositoryPort,
} from '../ports/google-auth-session-repository.port';

// El navegador puede tardar en volver (elegir cuenta, 2FA...); 10 minutos da
// margen sin dejar sesiones pendientes eternas acumulándose en la tabla.
const SESSION_TTL_MS = 10 * 60 * 1000;

export interface GoogleAuthSessionStart {
  sessionId: string;
  authUrl: string;
}

@Injectable()
export class StartGoogleAuthSessionUseCase {
  constructor(
    @Inject(GOOGLE_AUTH_SESSION_REPOSITORY)
    private readonly sessions: GoogleAuthSessionRepositoryPort,
    private readonly config: ConfigService,
  ) {}

  async execute(): Promise<GoogleAuthSessionStart> {
    const state = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    const session = await this.sessions.create({ state, expiresAt });

    return { sessionId: session.id, authUrl: this.buildAuthUrl(state) };
  }

  private buildAuthUrl(state: string): string {
    const clientId = this.config.getOrThrow<string>('GOOGLE_OAUTH_CLIENT_ID');
    const redirectUri = this.config.getOrThrow<string>(
      'GOOGLE_OAUTH_REDIRECT_URI',
    );

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }
}
