import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import { GoogleAuthSessionNotFoundError } from '../../domain/errors/google-auth-session-not-found.error';
import type { GoogleAuthSessionStatus } from '../../domain/entities/google-auth-session.entity';
import {
  GOOGLE_AUTH_SESSION_REPOSITORY,
  type GoogleAuthSessionRepositoryPort,
} from '../ports/google-auth-session-repository.port';
import { GetCurrentUserUseCase } from './get-current-user.use-case';

export interface GoogleAuthSessionStatusResult {
  status: GoogleAuthSessionStatus;
  accessToken: string | null;
  user: User | null;
  failureReason: string | null;
}

// La app hace polling sobre este use-case tras abrir el navegador, hasta que
// el status deja de ser PENDING (lo escribe CompleteGoogleAuthSessionUseCase
// desde el callback HTTP al que redirige Google).
@Injectable()
export class GetGoogleAuthSessionUseCase {
  constructor(
    @Inject(GOOGLE_AUTH_SESSION_REPOSITORY)
    private readonly sessions: GoogleAuthSessionRepositoryPort,
    private readonly getCurrentUser: GetCurrentUserUseCase,
  ) {}

  async execute(id: string): Promise<GoogleAuthSessionStatusResult> {
    const session = await this.sessions.findById(id);
    if (!session) {
      throw new GoogleAuthSessionNotFoundError(id);
    }

    if (session.status === 'READY' && session.accessToken && session.userId) {
      const user = await this.getCurrentUser.execute(session.userId);
      return {
        status: 'READY',
        accessToken: session.accessToken,
        user,
        failureReason: null,
      };
    }

    if (session.status === 'FAILED') {
      return {
        status: 'FAILED',
        accessToken: null,
        user: null,
        failureReason: session.failureReason,
      };
    }

    return {
      status: 'PENDING',
      accessToken: null,
      user: null,
      failureReason: null,
    };
  }
}
