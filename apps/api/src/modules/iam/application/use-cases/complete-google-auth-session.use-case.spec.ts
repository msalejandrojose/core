import { GoogleAuthSession } from '../../domain/entities/google-auth-session.entity';
import { User } from '../../domain/entities/user.entity';
import type { SocialProfile } from '../dto/social-profile';
import type { GoogleAuthCodeExchangerPort } from '../ports/google-auth-code-exchanger.port';
import type {
  GoogleAuthSessionRepositoryPort,
  MarkGoogleAuthSessionReadyData,
} from '../ports/google-auth-session-repository.port';
import type { GoogleTokenVerifierPort } from '../ports/google-token-verifier.port';
import { CompleteGoogleAuthSessionUseCase } from './complete-google-auth-session.use-case';
import type {
  ResolveSocialUserResult,
  ResolveSocialUserUseCase,
} from './resolve-social-user.use-case';

const STATE = 'state-abc';
const CODE = 'code-123';

function pendingSession(overrides: Partial<GoogleAuthSession> = {}) {
  return new GoogleAuthSession(
    overrides.id ?? 'session-1',
    overrides.state ?? STATE,
    overrides.status ?? 'PENDING',
    overrides.accessToken ?? null,
    overrides.userId ?? null,
    overrides.failureReason ?? null,
    overrides.expiresAt ?? new Date(Date.now() + 60_000),
  );
}

class FakeGoogleAuthSessionRepository implements GoogleAuthSessionRepositoryPort {
  private sessions = new Map<string, GoogleAuthSession>();
  readonly markedReady: { id: string; data: MarkGoogleAuthSessionReadyData }[] =
    [];
  readonly markedFailed: { id: string; reason: string }[] = [];

  seed(session: GoogleAuthSession): void {
    this.sessions.set(session.id, session);
  }

  create(): Promise<never> {
    throw new Error('not used in this test');
  }

  findById(id: string): Promise<GoogleAuthSession | null> {
    return Promise.resolve(this.sessions.get(id) ?? null);
  }

  findByState(state: string): Promise<GoogleAuthSession | null> {
    const found = [...this.sessions.values()].find((s) => s.state === state);
    return Promise.resolve(found ?? null);
  }

  markReady(
    id: string,
    data: MarkGoogleAuthSessionReadyData,
  ): Promise<GoogleAuthSession> {
    this.markedReady.push({ id, data });
    const existing = this.sessions.get(id)!;
    const updated = new GoogleAuthSession(
      existing.id,
      existing.state,
      'READY',
      data.accessToken,
      data.userId,
      null,
      existing.expiresAt,
    );
    this.sessions.set(id, updated);
    return Promise.resolve(updated);
  }

  markFailed(id: string, reason: string): Promise<GoogleAuthSession> {
    this.markedFailed.push({ id, reason });
    const existing = this.sessions.get(id)!;
    const updated = new GoogleAuthSession(
      existing.id,
      existing.state,
      'FAILED',
      null,
      null,
      reason,
      existing.expiresAt,
    );
    this.sessions.set(id, updated);
    return Promise.resolve(updated);
  }
}

class FakeExchanger implements GoogleAuthCodeExchangerPort {
  calls: string[] = [];
  constructor(private readonly result: string | Error) {}
  exchange(code: string): Promise<string> {
    this.calls.push(code);
    return this.result instanceof Error
      ? Promise.reject(this.result)
      : Promise.resolve(this.result);
  }
}

class FakeVerifier implements GoogleTokenVerifierPort {
  constructor(private readonly result: SocialProfile | Error) {}
  verify(): Promise<SocialProfile> {
    return this.result instanceof Error
      ? Promise.reject(this.result)
      : Promise.resolve(this.result);
  }
}

class FakeResolveSocialUser {
  calls: unknown[] = [];
  constructor(private readonly result: ResolveSocialUserResult | Error) {}
  execute(...args: unknown[]): Promise<ResolveSocialUserResult> {
    this.calls.push(args);
    return this.result instanceof Error
      ? Promise.reject(this.result)
      : Promise.resolve(this.result);
  }
}

const PROFILE: SocialProfile = {
  providerId: 'google-1',
  email: 'jugador@example.com',
  firstName: 'Ada',
  lastName: null,
  avatarUrl: null,
};

const RESOLVED_USER = new User(
  'user-1',
  PROFILE.email!,
  null,
  PROFILE.firstName,
  PROFILE.lastName,
  'APP',
  true,
  null,
  new Date(),
  new Date(),
  null,
  null,
  null,
  null,
  PROFILE.providerId,
  null,
  null,
);

describe('CompleteGoogleAuthSessionUseCase', () => {
  it('marca la sesión READY cuando el canje y la resolución de usuario funcionan', async () => {
    const repo = new FakeGoogleAuthSessionRepository();
    repo.seed(pendingSession());
    const resolveSocialUser = new FakeResolveSocialUser({
      accessToken: 'jwt-abc',
      user: RESOLVED_USER,
    });
    const useCase = new CompleteGoogleAuthSessionUseCase(
      repo,
      new FakeExchanger('id-token-xyz'),
      new FakeVerifier(PROFILE),
      resolveSocialUser as unknown as ResolveSocialUserUseCase,
    );

    const ok = await useCase.execute(STATE, CODE);

    expect(ok).toBe(true);
    expect(repo.markedReady).toEqual([
      { id: 'session-1', data: { accessToken: 'jwt-abc', userId: 'user-1' } },
    ]);
    expect(repo.markedFailed).toHaveLength(0);
  });

  it('marca la sesión FAILED si el canje del code falla', async () => {
    const repo = new FakeGoogleAuthSessionRepository();
    repo.seed(pendingSession());
    const useCase = new CompleteGoogleAuthSessionUseCase(
      repo,
      new FakeExchanger(new Error('boom')),
      new FakeVerifier(PROFILE),
      new FakeResolveSocialUser({
        accessToken: 'jwt',
        user: RESOLVED_USER,
      }) as unknown as ResolveSocialUserUseCase,
    );

    const ok = await useCase.execute(STATE, CODE);

    expect(ok).toBe(false);
    expect(repo.markedFailed).toEqual([
      { id: 'session-1', reason: 'google_auth_failed' },
    ]);
    expect(repo.markedReady).toHaveLength(0);
  });

  it('lanza GoogleAuthSessionNotFoundError si no hay sesión con ese state', async () => {
    const repo = new FakeGoogleAuthSessionRepository();
    const useCase = new CompleteGoogleAuthSessionUseCase(
      repo,
      new FakeExchanger('id-token'),
      new FakeVerifier(PROFILE),
      new FakeResolveSocialUser({
        accessToken: 'jwt',
        user: RESOLVED_USER,
      }) as unknown as ResolveSocialUserUseCase,
    );

    await expect(useCase.execute(STATE, CODE)).rejects.toMatchObject({
      code: 'GOOGLE_AUTH_SESSION_NOT_FOUND',
    });
  });

  it('no reprocesa una sesión que ya no está PENDING', async () => {
    const repo = new FakeGoogleAuthSessionRepository();
    repo.seed(
      pendingSession({
        status: 'READY',
        accessToken: 'jwt-previo',
        userId: 'user-1',
      }),
    );
    const exchanger = new FakeExchanger('id-token');
    const useCase = new CompleteGoogleAuthSessionUseCase(
      repo,
      exchanger,
      new FakeVerifier(PROFILE),
      new FakeResolveSocialUser({
        accessToken: 'jwt',
        user: RESOLVED_USER,
      }) as unknown as ResolveSocialUserUseCase,
    );

    const ok = await useCase.execute(STATE, CODE);

    expect(ok).toBe(true);
    expect(exchanger.calls).toHaveLength(0);
    expect(repo.markedReady).toHaveLength(0);
  });
});
