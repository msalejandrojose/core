import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  GOOGLE_AUTH_CODE_EXCHANGER,
  type GoogleAuthCodeExchangerPort,
} from '../ports/google-auth-code-exchanger.port';
import {
  GOOGLE_AUTH_SESSION_REPOSITORY,
  type GoogleAuthSessionRepositoryPort,
} from '../ports/google-auth-session-repository.port';
import {
  GOOGLE_TOKEN_VERIFIER,
  type GoogleTokenVerifierPort,
} from '../ports/google-token-verifier.port';
import { GoogleAuthSessionNotFoundError } from '../../domain/errors/google-auth-session-not-found.error';
import { ResolveSocialUserUseCase } from './resolve-social-user.use-case';

// Se ejecuta desde el callback HTTP al que Google redirige el navegador del
// jugador (nunca desde la app), así que no puede devolver el resultado por
// return value: lo deja escrito en la sesión para que la app lo recoja
// haciendo polling vía GetGoogleAuthSessionUseCase.
@Injectable()
export class CompleteGoogleAuthSessionUseCase {
  private readonly logger = new Logger(CompleteGoogleAuthSessionUseCase.name);

  constructor(
    @Inject(GOOGLE_AUTH_SESSION_REPOSITORY)
    private readonly sessions: GoogleAuthSessionRepositoryPort,
    @Inject(GOOGLE_AUTH_CODE_EXCHANGER)
    private readonly exchanger: GoogleAuthCodeExchangerPort,
    @Inject(GOOGLE_TOKEN_VERIFIER)
    private readonly verifier: GoogleTokenVerifierPort,
    private readonly resolveSocialUser: ResolveSocialUserUseCase,
  ) {}

  /** Devuelve `true` si la sesión quedó READY, `false` si quedó FAILED. */
  async execute(state: string, code: string): Promise<boolean> {
    const session = await this.sessions.findByState(state);
    if (!session) {
      throw new GoogleAuthSessionNotFoundError(state);
    }

    // El callback de Google puede llegar duplicado (doble clic, retry del
    // navegador); una sesión que ya no está PENDING no se reprocesa.
    if (session.status !== 'PENDING') {
      return session.status === 'READY';
    }

    try {
      const idToken = await this.exchanger.exchange(code);
      const profile = await this.verifier.verify(idToken);
      const { accessToken, user } = await this.resolveSocialUser.execute(
        'google',
        profile,
      );
      await this.sessions.markReady(session.id, {
        accessToken,
        userId: user.id,
      });
      return true;
    } catch (err) {
      this.logger.warn(
        `No se pudo completar el login con Google (sesión ${session.id}): ${String(err)}`,
      );
      await this.sessions.markFailed(session.id, 'google_auth_failed');
      return false;
    }
  }
}
