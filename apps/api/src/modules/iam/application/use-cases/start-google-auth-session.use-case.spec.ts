import { ConfigService } from '@nestjs/config';
import { GoogleAuthSession } from '../../domain/entities/google-auth-session.entity';
import type {
  CreateGoogleAuthSessionData,
  GoogleAuthSessionRepositoryPort,
} from '../ports/google-auth-session-repository.port';
import { StartGoogleAuthSessionUseCase } from './start-google-auth-session.use-case';

class FakeGoogleAuthSessionRepository implements GoogleAuthSessionRepositoryPort {
  readonly created: CreateGoogleAuthSessionData[] = [];

  create(data: CreateGoogleAuthSessionData): Promise<GoogleAuthSession> {
    this.created.push(data);
    return Promise.resolve(
      new GoogleAuthSession(
        'session-1',
        data.state,
        'PENDING',
        null,
        null,
        null,
        data.expiresAt,
      ),
    );
  }
  findById(): Promise<GoogleAuthSession | null> {
    throw new Error('not used in this test');
  }
  findByState(): Promise<GoogleAuthSession | null> {
    throw new Error('not used in this test');
  }
  markReady(): Promise<GoogleAuthSession> {
    throw new Error('not used in this test');
  }
  markFailed(): Promise<GoogleAuthSession> {
    throw new Error('not used in this test');
  }
}

function config(values: Record<string, string>): ConfigService {
  return {
    getOrThrow: (key: string) => values[key],
  } as unknown as ConfigService;
}

describe('StartGoogleAuthSessionUseCase', () => {
  it('crea una sesión PENDING y devuelve la URL de consentimiento de Google', async () => {
    const repo = new FakeGoogleAuthSessionRepository();
    const useCase = new StartGoogleAuthSessionUseCase(
      repo,
      config({
        GOOGLE_OAUTH_CLIENT_ID: 'client-abc',
        GOOGLE_OAUTH_REDIRECT_URI:
          'https://api.example.com/auth/google/callback',
      }),
    );

    const result = await useCase.execute();

    expect(result.sessionId).toBe('session-1');
    expect(repo.created).toHaveLength(1);
    expect(result.authUrl).toContain(
      'https://accounts.google.com/o/oauth2/v2/auth?',
    );
    expect(result.authUrl).toContain('client_id=client-abc');
    expect(result.authUrl).toContain(
      `redirect_uri=${encodeURIComponent('https://api.example.com/auth/google/callback')}`,
    );
    expect(result.authUrl).toContain(`state=${repo.created[0].state}`);
  });

  it('genera un state distinto en cada llamada', async () => {
    const repo = new FakeGoogleAuthSessionRepository();
    const useCase = new StartGoogleAuthSessionUseCase(
      repo,
      config({
        GOOGLE_OAUTH_CLIENT_ID: 'client-abc',
        GOOGLE_OAUTH_REDIRECT_URI:
          'https://api.example.com/auth/google/callback',
      }),
    );

    await useCase.execute();
    await useCase.execute();

    expect(repo.created[0].state).not.toBe(repo.created[1].state);
  });
});
