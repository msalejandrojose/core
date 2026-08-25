import { GoogleAuthSession } from '../../domain/entities/google-auth-session.entity';

export const GOOGLE_AUTH_SESSION_REPOSITORY = Symbol(
  'IAM_GOOGLE_AUTH_SESSION_REPOSITORY',
);

export interface CreateGoogleAuthSessionData {
  state: string;
  expiresAt: Date;
}

export interface MarkGoogleAuthSessionReadyData {
  accessToken: string;
  userId: string;
}

export interface GoogleAuthSessionRepositoryPort {
  create(data: CreateGoogleAuthSessionData): Promise<GoogleAuthSession>;
  findById(id: string): Promise<GoogleAuthSession | null>;
  /** El callback de Google no manda el id de sesión, manda el `state`. */
  findByState(state: string): Promise<GoogleAuthSession | null>;
  markReady(
    id: string,
    data: MarkGoogleAuthSessionReadyData,
  ): Promise<GoogleAuthSession>;
  markFailed(id: string, reason: string): Promise<GoogleAuthSession>;
}
