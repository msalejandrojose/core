import { Friend } from '../../domain/entities/friendship.entity';
import { OnlineRace } from '../../domain/entities/online-race.entity';
import { RacingCoinSource } from '../../domain/entities/racing-wallet.entity';
import { Track } from '../../domain/entities/track.entity';
import { FriendshipRepositoryPort } from '../ports/friendship-repository.port';
import {
  CreateOnlineRaceData,
  OnlineRaceRepositoryPort,
} from '../ports/online-race-repository.port';
import {
  CreditCoinsData,
  RacingWalletRepositoryPort,
} from '../ports/racing-wallet-repository.port';
import { TrackRepositoryPort } from '../ports/track-repository.port';
import { SubmitOnlineRaceResultUseCase } from './submit-online-race-result.use-case';

const TRACK = new Track('track-1', 'kenney-01', 'Kenney', 4, 8000, true);
const PLAYER_ID = 'player-1';

class FakeTrackRepository implements Partial<TrackRepositoryPort> {
  constructor(private readonly track: Track | null) {}
  findBySlug(): Promise<Track | null> {
    return Promise.resolve(this.track);
  }
}

class FakeOnlineRaceRepository implements Partial<OnlineRaceRepositoryPort> {
  lastCreate: CreateOnlineRaceData | null = null;

  constructor(private readonly recentPositions: number[] = []) {}

  create(data: CreateOnlineRaceData): Promise<OnlineRace> {
    this.lastCreate = data;
    return Promise.resolve(
      new OnlineRace(
        'race-1',
        data.userId,
        data.trackId,
        new Date(),
        data.participants.map((p) => ({ ...p })),
      ),
    );
  }

  recentPlayerPositions(): Promise<number[]> {
    return Promise.resolve(this.recentPositions);
  }
}

class FakeFriendshipRepository implements Partial<FriendshipRepositoryPort> {
  constructor(private readonly friends: Friend[] = []) {}

  listFriends(): Promise<Friend[]> {
    return Promise.resolve(this.friends);
  }
}

class FakeRacingWalletRepository
  implements Partial<RacingWalletRepositoryPort>
{
  credits: CreditCoinsData[] = [];

  credit(data: CreditCoinsData): Promise<number> {
    this.credits.push(data);
    return Promise.resolve(
      this.credits.reduce((sum, entry) => sum + entry.amount, 0),
    );
  }
}

function useCase(
  track: Track | null,
  races = new FakeOnlineRaceRepository(),
  wallets = new FakeRacingWalletRepository(),
  friendships = new FakeFriendshipRepository(),
) {
  return {
    uc: new SubmitOnlineRaceResultUseCase(
      new FakeTrackRepository(track) as unknown as TrackRepositoryPort,
      races as unknown as OnlineRaceRepositoryPort,
      wallets as unknown as RacingWalletRepositoryPort,
      friendships as unknown as FriendshipRepositoryPort,
    ),
    races,
    wallets,
    friendships,
  };
}

describe('SubmitOnlineRaceResultUseCase', () => {
  it('rechaza un circuito que no existe', async () => {
    const { uc } = useCase(null);
    await expect(
      uc.execute({
        userId: PLAYER_ID,
        trackSlug: 'no-existe',
        durationMs: 42000,
        rivals: [],
      }),
    ).rejects.toMatchObject({ code: 'RACING_TRACK_NOT_FOUND' });
  });

  it('registra la carrera en solitario cuando no hay rivales', async () => {
    const { uc } = useCase(TRACK);
    const result = await uc.execute({
      userId: PLAYER_ID,
      trackSlug: 'kenney-01',
      durationMs: 42000,
      rivals: [],
    });
    expect(result.participants).toHaveLength(1);
    expect(result.participants[0].role).toBe('PLAYER');
  });

  it('registra la carrera resolviendo el trackId por slug y el podio', async () => {
    const { uc, races } = useCase(TRACK);
    const result = await uc.execute({
      userId: PLAYER_ID,
      trackSlug: 'kenney-01',
      durationMs: 42000,
      rivals: [{ role: 'TARGET', userId: 'target-1', durationMs: 41000 }],
    });

    expect(races.lastCreate?.trackId).toBe('track-1');
    expect(result.participants.map((p) => p.role)).toEqual([
      'TARGET',
      'PLAYER',
    ]);
    expect(result.participants.map((p) => p.position)).toEqual([1, 2]);
  });

  it('no hace falta que el cliente declare su propio id: se usa el del token', async () => {
    const { uc } = useCase(TRACK);
    const result = await uc.execute({
      userId: PLAYER_ID,
      trackSlug: 'kenney-01',
      durationMs: 42000,
      rivals: [],
    });
    expect(result.participants[0].userId).toBe(PLAYER_ID);
  });

  it('acredita 100 monedas al jugador si queda 1º (TASK-318/286)', async () => {
    const { uc, wallets } = useCase(TRACK);
    await uc.execute({
      userId: PLAYER_ID,
      trackSlug: 'kenney-01',
      durationMs: 42000,
      rivals: [],
    });

    expect(wallets.credits).toEqual([
      {
        userId: PLAYER_ID,
        amount: 100,
        source: RacingCoinSource.RACE_FIRST_PLACE,
        onlineRaceId: 'race-1',
      },
    ]);
  });

  it('acredita 60 monedas si el jugador queda 2º', async () => {
    const { uc, wallets } = useCase(TRACK);
    await uc.execute({
      userId: PLAYER_ID,
      trackSlug: 'kenney-01',
      durationMs: 42000,
      rivals: [{ role: 'TARGET', userId: 'target-1', durationMs: 41000 }],
    });

    expect(wallets.credits).toEqual([
      {
        userId: PLAYER_ID,
        amount: 60,
        source: RacingCoinSource.RACE_SECOND_PLACE,
        onlineRaceId: 'race-1',
      },
    ]);
  });

  it('acredita 40 monedas si el jugador queda 3º', async () => {
    const { uc, wallets } = useCase(TRACK);
    await uc.execute({
      userId: PLAYER_ID,
      trackSlug: 'kenney-01',
      durationMs: 42000,
      rivals: [
        { role: 'TARGET', userId: 'target-1', durationMs: 41000 },
        { role: 'THREAT', userId: 'threat-1', durationMs: 41500 },
      ],
    });

    expect(wallets.credits).toEqual([
      {
        userId: PLAYER_ID,
        amount: 40,
        source: RacingCoinSource.RACE_THIRD_PLACE,
        onlineRaceId: 'race-1',
      },
    ]);
  });

  it('no acredita nada a los fantasmas rivales, solo al jugador', async () => {
    const { uc, wallets } = useCase(TRACK);
    await uc.execute({
      userId: PLAYER_ID,
      trackSlug: 'kenney-01',
      durationMs: 42000,
      rivals: [{ role: 'TARGET', userId: 'target-1', durationMs: 41000 }],
    });

    expect(wallets.credits).toHaveLength(1);
    expect(wallets.credits[0].userId).toBe(PLAYER_ID);
  });
});

describe('SubmitOnlineRaceResultUseCase — bono por batir a un amigo (TASK-321)', () => {
  it('acredita 60 monedas si el rival al que gana es amigo', async () => {
    const friends = [new Friend('target-1', 'Ana', new Date())];
    const { uc, wallets } = useCase(
      TRACK,
      new FakeOnlineRaceRepository(),
      new FakeRacingWalletRepository(),
      new FakeFriendshipRepository(friends),
    );
    await uc.execute({
      userId: PLAYER_ID,
      trackSlug: 'kenney-01',
      durationMs: 42000,
      rivals: [{ role: 'TARGET', userId: 'target-1', durationMs: 43000 }],
    });

    expect(wallets.credits).toContainEqual({
      userId: PLAYER_ID,
      amount: 60,
      source: RacingCoinSource.BEAT_FRIEND,
      onlineRaceId: 'race-1',
    });
  });

  it('NO acredita el bono social si el rival vencido no es amigo', async () => {
    const { uc, wallets } = useCase(TRACK);
    await uc.execute({
      userId: PLAYER_ID,
      trackSlug: 'kenney-01',
      durationMs: 42000,
      rivals: [{ role: 'TARGET', userId: 'target-1', durationMs: 43000 }],
    });

    expect(wallets.credits).not.toContainEqual(
      expect.objectContaining({ source: RacingCoinSource.BEAT_FRIEND }),
    );
  });

  it('NO acredita el bono social si el amigo emparejado gana la carrera', async () => {
    const friends = [new Friend('target-1', 'Ana', new Date())];
    const { uc, wallets } = useCase(
      TRACK,
      new FakeOnlineRaceRepository(),
      new FakeRacingWalletRepository(),
      new FakeFriendshipRepository(friends),
    );
    await uc.execute({
      userId: PLAYER_ID,
      trackSlug: 'kenney-01',
      durationMs: 42000,
      rivals: [{ role: 'TARGET', userId: 'target-1', durationMs: 41000 }],
    });

    expect(wallets.credits).not.toContainEqual(
      expect.objectContaining({ source: RacingCoinSource.BEAT_FRIEND }),
    );
  });

  it('un solo bono social aunque gane a dos amigos en la misma carrera', async () => {
    const friends = [
      new Friend('target-1', 'Ana', new Date()),
      new Friend('threat-1', 'Beto', new Date()),
    ];
    const { uc, wallets } = useCase(
      TRACK,
      new FakeOnlineRaceRepository(),
      new FakeRacingWalletRepository(),
      new FakeFriendshipRepository(friends),
    );
    await uc.execute({
      userId: PLAYER_ID,
      trackSlug: 'kenney-01',
      durationMs: 42000,
      rivals: [
        { role: 'TARGET', userId: 'target-1', durationMs: 43000 },
        { role: 'THREAT', userId: 'threat-1', durationMs: 44000 },
      ],
    });

    expect(
      wallets.credits.filter((c) => c.source === RacingCoinSource.BEAT_FRIEND),
    ).toHaveLength(1);
  });
});

describe('SubmitOnlineRaceResultUseCase — racha de victorias (TASK-321)', () => {
  it('NO acredita bono de racha en la primera victoria', async () => {
    const { uc, wallets } = useCase(
      TRACK,
      new FakeOnlineRaceRepository([1]),
    );
    await uc.execute({
      userId: PLAYER_ID,
      trackSlug: 'kenney-01',
      durationMs: 42000,
      rivals: [],
    });

    expect(wallets.credits).not.toContainEqual(
      expect.objectContaining({ source: RacingCoinSource.WIN_STREAK }),
    );
  });

  it('acredita 20 monedas en la 2ª victoria seguida', async () => {
    const { uc, wallets } = useCase(
      TRACK,
      new FakeOnlineRaceRepository([1, 1]),
    );
    await uc.execute({
      userId: PLAYER_ID,
      trackSlug: 'kenney-01',
      durationMs: 42000,
      rivals: [],
    });

    expect(wallets.credits).toContainEqual({
      userId: PLAYER_ID,
      amount: 20,
      source: RacingCoinSource.WIN_STREAK,
      onlineRaceId: 'race-1',
    });
  });

  it('acredita 40 monedas en la 3ª victoria seguida', async () => {
    const { uc, wallets } = useCase(
      TRACK,
      new FakeOnlineRaceRepository([1, 1, 1]),
    );
    await uc.execute({
      userId: PLAYER_ID,
      trackSlug: 'kenney-01',
      durationMs: 42000,
      rivals: [],
    });

    expect(wallets.credits).toContainEqual(
      expect.objectContaining({ amount: 40, source: RacingCoinSource.WIN_STREAK }),
    );
  });

  it('acredita como mucho 60 monedas, aunque la racha sea más larga', async () => {
    const { uc, wallets } = useCase(
      TRACK,
      new FakeOnlineRaceRepository([1, 1, 1, 1, 1]),
    );
    await uc.execute({
      userId: PLAYER_ID,
      trackSlug: 'kenney-01',
      durationMs: 42000,
      rivals: [],
    });

    expect(wallets.credits).toContainEqual(
      expect.objectContaining({ amount: 60, source: RacingCoinSource.WIN_STREAK }),
    );
  });

  it('la racha se corta en cuanto hay una carrera no ganada', async () => {
    const { uc, wallets } = useCase(
      TRACK,
      new FakeOnlineRaceRepository([1, 2, 1, 1]),
    );
    await uc.execute({
      userId: PLAYER_ID,
      trackSlug: 'kenney-01',
      durationMs: 42000,
      rivals: [],
    });

    expect(wallets.credits).not.toContainEqual(
      expect.objectContaining({ source: RacingCoinSource.WIN_STREAK }),
    );
  });

  it('NO acredita bono de racha si esta carrera no se gana', async () => {
    const { uc, wallets } = useCase(
      TRACK,
      new FakeOnlineRaceRepository([2, 1, 1]),
    );
    await uc.execute({
      userId: PLAYER_ID,
      trackSlug: 'kenney-01',
      durationMs: 42000,
      rivals: [
        { role: 'TARGET', userId: 'target-1', durationMs: 41000 },
      ],
    });

    expect(wallets.credits).not.toContainEqual(
      expect.objectContaining({ source: RacingCoinSource.WIN_STREAK }),
    );
  });
});
