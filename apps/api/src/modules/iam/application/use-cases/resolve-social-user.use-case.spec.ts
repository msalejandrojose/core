import { User } from '../../domain/entities/user.entity';
import type { SocialProfile } from '../dto/social-profile';
import type {
  LinkSocialAccountPatch,
  UserRepositoryPort,
} from '../ports/user-repository.port';
import type { TokenIssuerPort } from '../ports/token-issuer.port';
import { ResolveSocialUserUseCase } from './resolve-social-user.use-case';

function buildUser(id: string, email: string): User {
  return new User(
    id,
    email,
    null,
    'Existing',
    'User',
    'APP',
    true,
    null,
    new Date('2026-01-01T00:00:00.000Z'),
    new Date('2026-01-01T00:00:00.000Z'),
  );
}

class FakeUserRepository implements Partial<UserRepositoryPort> {
  byId = new Map<string, User>();
  byEmail = new Map<string, User>();
  byProvider = new Map<string, User>();
  linked: { id: string; patch: LinkSocialAccountPatch }[] = [];
  created: User[] = [];

  findByEmail(email: string): Promise<User | null> {
    return Promise.resolve(this.byEmail.get(email) ?? null);
  }

  findByGoogleId(id: string): Promise<User | null> {
    return Promise.resolve(this.byProvider.get(`google:${id}`) ?? null);
  }

  findByFacebookId(id: string): Promise<User | null> {
    return Promise.resolve(this.byProvider.get(`facebook:${id}`) ?? null);
  }

  findByPlayGamesId(id: string): Promise<User | null> {
    return Promise.resolve(this.byProvider.get(`play_games:${id}`) ?? null);
  }

  findByGameCenterId(id: string): Promise<User | null> {
    return Promise.resolve(this.byProvider.get(`game_center:${id}`) ?? null);
  }

  create(user: User): Promise<User> {
    this.created.push(user);
    return Promise.resolve(user);
  }

  linkSocialAccount(id: string, patch: LinkSocialAccountPatch): Promise<User> {
    this.linked.push({ id, patch });
    const existing = this.byId.get(id);
    if (!existing) throw new Error('user not found in fake repo');
    return Promise.resolve(existing);
  }
}

class FakeTokenIssuer implements TokenIssuerPort {
  issue(): Promise<string> {
    return Promise.resolve('fake-token');
  }
  verify(): Promise<never> {
    throw new Error('not used in this test');
  }
}

describe('ResolveSocialUserUseCase', () => {
  it('crea una cuenta nueva por play_games con el email de relleno ya sintetizado en el perfil', async () => {
    const repo = new FakeUserRepository();
    const useCase = new ResolveSocialUserUseCase(
      repo as unknown as UserRepositoryPort,
      new FakeTokenIssuer(),
    );

    const profile: SocialProfile = {
      providerId: 'pg-123',
      email: 'play-games-pg-123@accounts.invalid',
      firstName: 'Jugador',
      lastName: null,
      avatarUrl: null,
    };

    const result = await useCase.execute('play_games', profile);

    expect(repo.created).toHaveLength(1);
    expect(repo.created[0].playGamesId).toBe('pg-123');
    expect(repo.created[0].email).toBe('play-games-pg-123@accounts.invalid');
    expect(result.accessToken).toBe('fake-token');
  });

  it('crea una cuenta nueva por game_center', async () => {
    const repo = new FakeUserRepository();
    const useCase = new ResolveSocialUserUseCase(
      repo as unknown as UserRepositoryPort,
      new FakeTokenIssuer(),
    );

    const profile: SocialProfile = {
      providerId: 'gc-456',
      email: 'game-center-gc-456@accounts.invalid',
      firstName: null,
      lastName: null,
      avatarUrl: null,
    };

    await useCase.execute('game_center', profile);

    expect(repo.created).toHaveLength(1);
    expect(repo.created[0].gameCenterId).toBe('gc-456');
    expect(repo.created[0].googleId).toBeNull();
    expect(repo.created[0].playGamesId).toBeNull();
  });

  it('vincula game_center a una cuenta existente con el mismo email en vez de crear otra', async () => {
    const repo = new FakeUserRepository();
    const existing = buildUser('user-1', 'game-center-gc-456@accounts.invalid');
    repo.byId.set(existing.id, existing);
    repo.byEmail.set(existing.email, existing);

    const useCase = new ResolveSocialUserUseCase(
      repo as unknown as UserRepositoryPort,
      new FakeTokenIssuer(),
    );

    const profile: SocialProfile = {
      providerId: 'gc-456',
      email: 'game-center-gc-456@accounts.invalid',
      firstName: null,
      lastName: null,
      avatarUrl: null,
    };

    await useCase.execute('game_center', profile);

    expect(repo.created).toHaveLength(0);
    expect(repo.linked).toHaveLength(1);
    expect(repo.linked[0].patch).toMatchObject({ gameCenterId: 'gc-456' });
  });
});
