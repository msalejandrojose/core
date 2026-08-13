import { GoogleAuthSession } from '../../domain/entities/google-auth-session.entity';
import { User } from '../../domain/entities/user.entity';
import type { GoogleAuthSessionRepositoryPort } from '../ports/google-auth-session-repository.port';
import { GetCurrentUserUseCase } from './get-current-user.use-case';
import { GetGoogleAuthSessionUseCase } from './get-google-auth-session.use-case';

class FakeGoogleAuthSessionRepository implements GoogleAuthSessionRepositoryPort {
  constructor(private readonly session: GoogleAuthSession | null) {}

  create(): Promise<GoogleAuthSession> {
    throw new Error('not used in this test');
  }
  findById(id: string): Promise<GoogleAuthSession | null> {
    return Promise.resolve(this.session?.id === id ? this.session : null);
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

const USER = new User(
  'user-1',
  'jugador@example.com',
  null,
  'Ada',
  null,
  'APP',
  true,
  null,
  new Date(),
  new Date(),
);

class FakeUserRepository {
  findById(id: string): Promise<User | null> {
    return Promise.resolve(id === USER.id ? USER : null);
  }
}

function session(overrides: Partial<GoogleAuthSession> = {}) {
  return new GoogleAuthSession(
    overrides.id ?? 'session-1',
    overrides.state ?? 'state-1',
    overrides.status ?? 'PENDING',
    overrides.accessToken ?? null,
    overrides.userId ?? null,
    overrides.failureReason ?? null,
    overrides.expiresAt ?? new Date(Date.now() + 60_000),
  );
}

describe('GetGoogleAuthSessionUseCase', () => {
  it('devuelve PENDING mientras la sesión no se ha resuelto', async () => {
    const repo = new FakeGoogleAuthSessionRepository(session());
    const useCase = new GetGoogleAuthSessionUseCase(
      repo,
      new GetCurrentUserUseCase(new FakeUserRepository() as never),
    );

    const result = await useCase.execute('session-1');

    expect(result).toEqual({
      status: 'PENDING',
      accessToken: null,
      user: null,
      failureReason: null,
    });
  });

  it('devuelve el usuario y el access token cuando está READY', async () => {
    const repo = new FakeGoogleAuthSessionRepository(
      session({ status: 'READY', accessToken: 'jwt-abc', userId: USER.id }),
    );
    const useCase = new GetGoogleAuthSessionUseCase(
      repo,
      new GetCurrentUserUseCase(new FakeUserRepository() as never),
    );

    const result = await useCase.execute('session-1');

    expect(result.status).toBe('READY');
    expect(result.accessToken).toBe('jwt-abc');
    expect(result.user?.id).toBe(USER.id);
    expect(result.failureReason).toBeNull();
  });

  it('devuelve el motivo del fallo cuando está FAILED', async () => {
    const repo = new FakeGoogleAuthSessionRepository(
      session({ status: 'FAILED', failureReason: 'google_auth_failed' }),
    );
    const useCase = new GetGoogleAuthSessionUseCase(
      repo,
      new GetCurrentUserUseCase(new FakeUserRepository() as never),
    );

    const result = await useCase.execute('session-1');

    expect(result).toEqual({
      status: 'FAILED',
      accessToken: null,
      user: null,
      failureReason: 'google_auth_failed',
    });
  });

  it('lanza GoogleAuthSessionNotFoundError si no existe la sesión', async () => {
    const repo = new FakeGoogleAuthSessionRepository(null);
    const useCase = new GetGoogleAuthSessionUseCase(
      repo,
      new GetCurrentUserUseCase(new FakeUserRepository() as never),
    );

    await expect(useCase.execute('missing')).rejects.toMatchObject({
      code: 'GOOGLE_AUTH_SESSION_NOT_FOUND',
    });
  });
});
