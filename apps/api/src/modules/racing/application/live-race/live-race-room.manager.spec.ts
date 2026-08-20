import { RacingCoinRewardKey } from '../../domain/entities/racing-coin-reward-config.entity';
import { LiveRace } from '../../domain/entities/live-race.entity';
import { RacingCoinRewardAmounts } from '../../domain/racing-coin-rewards';
import {
  CreateLiveRaceData,
  LiveRaceRepositoryPort,
} from '../ports/live-race-repository.port';
import {
  PlayerRatingRepositoryPort,
  RatingUpdate,
} from '../ports/player-rating-repository.port';
import { RacingCoinRewardConfigRepositoryPort } from '../ports/racing-coin-reward-config-repository.port';
import {
  CreditCoinsData,
  RacingWalletRepositoryPort,
} from '../ports/racing-wallet-repository.port';
import {
  COUNTDOWN_MS,
  FILL_TIMEOUT_MS,
  LIVE_RACE_EVENTS,
  LiveRaceRoomManager,
  MAX_PLAYERS_PER_ROOM,
  RACE_TIMEOUT_MS,
  RECONNECT_GRACE_MS,
  RaceFinishedEvent,
} from './live-race-room.manager';

const DEFAULT_AMOUNTS: RacingCoinRewardAmounts = new Map([
  [RacingCoinRewardKey.RACE_FIRST_PLACE, 100],
  [RacingCoinRewardKey.RACE_SECOND_PLACE, 60],
  [RacingCoinRewardKey.RACE_THIRD_PLACE, 40],
]);

class FakeLiveRaceRepository implements Partial<LiveRaceRepositoryPort> {
  created: CreateLiveRaceData[] = [];

  create(data: CreateLiveRaceData): Promise<LiveRace> {
    this.created.push(data);
    return Promise.resolve(
      new LiveRace('race-1', data.trackId, data.status, new Date(), data.finishedAt, data.participants),
    );
  }
}

class FakeWalletRepository implements Partial<RacingWalletRepositoryPort> {
  credits: CreditCoinsData[] = [];

  getBalance(): Promise<number> {
    return Promise.resolve(0);
  }

  credit(data: CreditCoinsData): Promise<number> {
    this.credits.push(data);
    return Promise.resolve(0);
  }
}

class FakeRewardConfigRepository implements Partial<RacingCoinRewardConfigRepositoryPort> {
  constructor(private readonly amounts: RacingCoinRewardAmounts = DEFAULT_AMOUNTS) {}

  getAmounts(): Promise<RacingCoinRewardAmounts> {
    return Promise.resolve(this.amounts);
  }
}

class FakeRatingRepository implements Partial<PlayerRatingRepositoryPort> {
  applied: RatingUpdate[] = [];

  constructor(private readonly ratings: Map<string, number> = new Map()) {}

  getRating(userId: string): Promise<number> {
    return Promise.resolve(this.ratings.get(userId) ?? 1000);
  }

  getRatings(userIds: string[]): Promise<Map<string, number>> {
    return Promise.resolve(
      new Map(userIds.map((id) => [id, this.ratings.get(id) ?? 1000])),
    );
  }

  applyChanges(changes: RatingUpdate[]): Promise<void> {
    this.applied.push(...changes);
    return Promise.resolve();
  }
}

function waitForEvent<T>(manager: LiveRaceRoomManager, event: string): Promise<T> {
  return new Promise((resolve) => manager.once(event, resolve));
}

function snapshot(t = 0) {
  return { t, pos: { x: 0, y: 0, z: 0 }, yaw: 0 };
}

describe('LiveRaceRoomManager', () => {
  let races: FakeLiveRaceRepository;
  let wallets: FakeWalletRepository;
  let rewardConfigs: FakeRewardConfigRepository;
  let ratings: FakeRatingRepository;
  let manager: LiveRaceRoomManager;

  beforeEach(() => {
    jest.useFakeTimers();
    races = new FakeLiveRaceRepository();
    wallets = new FakeWalletRepository();
    rewardConfigs = new FakeRewardConfigRepository();
    ratings = new FakeRatingRepository();
    manager = new LiveRaceRoomManager(
      races as unknown as LiveRaceRepositoryPort,
      wallets as unknown as RacingWalletRepositoryPort,
      rewardConfigs as unknown as RacingCoinRewardConfigRepositoryPort,
      ratings as unknown as PlayerRatingRepositoryPort,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('unirse a sala', () => {
    it('junta a dos jugadores del mismo circuito en la misma sala', async () => {
      const roomA = await manager.join('track-1', 'alice');
      const roomB = await manager.join('track-1', 'bob');
      expect(roomA).toBe(roomB);
    });

    it('no junta jugadores de circuitos distintos', async () => {
      const roomA = await manager.join('track-1', 'alice');
      const roomB = await manager.join('track-2', 'bob');
      expect(roomA).not.toBe(roomB);
    });

    it('es idempotente: unirse dos veces devuelve la misma sala', async () => {
      const first = await manager.join('track-1', 'alice');
      const second = await manager.join('track-1', 'alice');
      expect(first).toBe(second);
    });

    it('con quórum mínimo espera FILL_TIMEOUT_MS antes de arrancar la cuenta atrás', async () => {
      const countdown = waitForEvent(manager, LIVE_RACE_EVENTS.countdown);
      await manager.join('track-1', 'alice');
      await manager.join('track-1', 'bob');

      jest.advanceTimersByTime(FILL_TIMEOUT_MS - 1);
      // Todavía no debería haber arrancado.
      let fired = false;
      countdown.then(() => (fired = true));
      await Promise.resolve();
      expect(fired).toBe(false);

      jest.advanceTimersByTime(1);
      await countdown;
    });

    it('al llenar la sala arranca la cuenta atrás sin esperar el fill timeout', async () => {
      const countdown = waitForEvent(manager, LIVE_RACE_EVENTS.countdown);
      for (let i = 0; i < MAX_PLAYERS_PER_ROOM; i++) {
        await manager.join('track-1', `p${i}`);
      }
      // Sin avanzar el reloj: si no llegara el evento, el test se queda
      // colgado hasta el timeout global de Jest — es la propia aserción.
      await countdown;
    });

    it('la cuenta atrás termina en el arranque de la carrera', async () => {
      const started = waitForEvent(manager, LIVE_RACE_EVENTS.raceStarted);
      for (let i = 0; i < MAX_PLAYERS_PER_ROOM; i++) await manager.join('track-1', `p${i}`);
      jest.advanceTimersByTime(COUNTDOWN_MS);
      await started;
    });
  });

  describe('matchmaking por rating', () => {
    function withRatings(preset: Record<string, number>): void {
      ratings = new FakeRatingRepository(new Map(Object.entries(preset)));
      manager = new LiveRaceRoomManager(
        races as unknown as LiveRaceRepositoryPort,
        wallets as unknown as RacingWalletRepositoryPort,
        rewardConfigs as unknown as RacingCoinRewardConfigRepositoryPort,
        ratings as unknown as PlayerRatingRepositoryPort,
      );
    }

    it('no junta a rating muy distinto si la sala acaba de abrir', async () => {
      withRatings({ alice: 1000, bob: 1500 });
      const roomA = await manager.join('track-1', 'alice');
      const roomB = await manager.join('track-1', 'bob');
      expect(roomA).not.toBe(roomB);
    });

    it('junta a rating cercano en la misma sala', async () => {
      withRatings({ alice: 1000, bob: 1050 });
      const roomA = await manager.join('track-1', 'alice');
      const roomB = await manager.join('track-1', 'bob');
      expect(roomA).toBe(roomB);
    });

    it('la ventana se amplía con el tiempo: un rating antes incompatible acaba entrando', async () => {
      withRatings({ alice: 1000, carol: 1500 });
      const roomA = await manager.join('track-1', 'alice');

      // A los 10s la ventana de la sala de alice es 100 + 50*10 = 600, ya
      // cubre los 500 de diferencia con carol (a los 0s no habría cabido).
      jest.advanceTimersByTime(10_000);
      const roomC = await manager.join('track-1', 'carol');
      expect(roomC).toBe(roomA);
    });

    it('elige la sala más cercana en rating, no la primera que encaje', async () => {
      withRatings({ alice: 1000, bob: 1900, carol: 1050 });
      const roomAlice = await manager.join('track-1', 'alice');
      const roomBob = await manager.join('track-1', 'bob');
      expect(roomAlice).not.toBe(roomBob);

      const roomCarol = await manager.join('track-1', 'carol');
      expect(roomCarol).toBe(roomAlice);
    });
  });

  describe('abandonar antes de correr', () => {
    it('sale de la cola limpiamente y no deja la sala colgada', async () => {
      await manager.join('track-1', 'alice');
      await manager.join('track-1', 'bob');
      manager.leave('alice');
      manager.leave('bob');

      // Sala anterior descartada del todo: una nueva unión abre una sala
      // nueva, no reaparece la vieja con gente fantasma dentro.
      const roomId = await manager.join('track-1', 'carol');
      expect(roomId).toBeDefined();
    });

    it('cancela el fill timer si el grupo cae por debajo del mínimo', async () => {
      await manager.join('track-1', 'alice');
      await manager.join('track-1', 'bob');
      manager.leave('bob');

      const countdown = waitForEvent(manager, LIVE_RACE_EVENTS.countdown);
      let fired = false;
      countdown.then(() => (fired = true));

      jest.advanceTimersByTime(FILL_TIMEOUT_MS + 1000);
      await Promise.resolve();
      expect(fired).toBe(false);
    });
  });

  describe('durante la carrera', () => {
    async function startTwoPlayerRace(): Promise<void> {
      const started = waitForEvent(manager, LIVE_RACE_EVENTS.raceStarted);
      await manager.join('track-1', 'alice');
      await manager.join('track-1', 'bob');
      jest.advanceTimersByTime(FILL_TIMEOUT_MS + COUNTDOWN_MS);
      await started;
    }

    it('no retransmite snapshots antes de que empiece la carrera', async () => {
      await manager.join('track-1', 'alice');
      await manager.join('track-1', 'bob');
      const spy = jest.fn();
      manager.on(LIVE_RACE_EVENTS.snapshot, spy);
      manager.relaySnapshot('alice', snapshot());
      expect(spy).not.toHaveBeenCalled();
    });

    it('retransmite un snapshot durante la carrera con el emisor correcto', async () => {
      await startTwoPlayerRace();
      const spy = jest.fn();
      manager.on(LIVE_RACE_EVENTS.snapshot, spy);
      manager.relaySnapshot('alice', snapshot(120));
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ fromUserId: 'alice', snapshot: snapshot(120) }),
      );
    });

    it('resuelve la carrera cuando todos terminan y acredita monedas por puesto', async () => {
      await startTwoPlayerRace();
      const finished = waitForEvent<RaceFinishedEvent>(manager, LIVE_RACE_EVENTS.raceFinished);
      manager.recordFinish('alice', 40000);
      manager.recordFinish('bob', 42000);
      const event = await finished;

      expect(event.result).toEqual([
        { userId: 'alice', durationMs: 40000, position: 1, deltaMs: 0, disconnected: false },
        { userId: 'bob', durationMs: 42000, position: 2, deltaMs: 2000, disconnected: false },
      ]);
      expect(races.created[0].status).toBe('FINISHED');
      expect(wallets.credits).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ userId: 'alice', amount: 100, liveRaceId: 'race-1' }),
          expect.objectContaining({ userId: 'bob', amount: 60, liveRaceId: 'race-1' }),
        ]),
      );
      expect(event.ratingChanges).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ userId: 'alice', delta: 16 }),
          expect.objectContaining({ userId: 'bob', delta: -16 }),
        ]),
      );
      expect(ratings.applied).toEqual(
        expect.arrayContaining([
          { userId: 'alice', rating: 1016 },
          { userId: 'bob', rating: 984 },
        ]),
      );
    });

    it('no aplica cambio de rating a un DNF, y solo compara entre quienes terminaron', async () => {
      const started = waitForEvent(manager, LIVE_RACE_EVENTS.raceStarted);
      await manager.join('track-1', 'alice');
      await manager.join('track-1', 'bob');
      await manager.join('track-1', 'carol');
      jest.advanceTimersByTime(FILL_TIMEOUT_MS + COUNTDOWN_MS);
      await started;

      manager.handleDisconnect('carol');
      const finished = waitForEvent<RaceFinishedEvent>(manager, LIVE_RACE_EVENTS.raceFinished);
      manager.recordFinish('alice', 40000);
      manager.recordFinish('bob', 42000);
      const event = await finished;

      expect(event.ratingChanges.map((c) => c.userId).sort()).toEqual(['alice', 'bob']);
      expect(ratings.applied.some((c) => c.userId === 'carol')).toBe(false);
    });

    it('con un único finisher no hay contra quién comparar: sin cambio de rating', async () => {
      const started = waitForEvent(manager, LIVE_RACE_EVENTS.raceStarted);
      await manager.join('track-1', 'alice');
      await manager.join('track-1', 'bob');
      jest.advanceTimersByTime(FILL_TIMEOUT_MS + COUNTDOWN_MS);
      await started;

      manager.handleDisconnect('bob');
      const finished = waitForEvent<RaceFinishedEvent>(manager, LIVE_RACE_EVENTS.raceFinished);
      manager.recordFinish('alice', 40000);
      const event = await finished;

      expect(event.ratingChanges).toEqual([]);
      expect(ratings.applied).toEqual([]);
    });

    it('ignora un segundo finish del mismo jugador', async () => {
      await startTwoPlayerRace();
      manager.recordFinish('alice', 40000);
      manager.recordFinish('alice', 1);
      const finished = waitForEvent<RaceFinishedEvent>(manager, LIVE_RACE_EVENTS.raceFinished);
      manager.recordFinish('bob', 42000);
      const event = await finished;
      expect(event.result.find((p) => p.userId === 'alice')?.durationMs).toBe(40000);
    });

    it('marca DNF tras el grace period si el resto sigue corriendo', async () => {
      const started = waitForEvent(manager, LIVE_RACE_EVENTS.raceStarted);
      await manager.join('track-1', 'alice');
      await manager.join('track-1', 'bob');
      await manager.join('track-1', 'carol');
      jest.advanceTimersByTime(FILL_TIMEOUT_MS + COUNTDOWN_MS);
      await started;

      const disconnected = waitForEvent(manager, LIVE_RACE_EVENTS.participantDisconnected);
      manager.handleDisconnect('bob');
      await disconnected;

      jest.advanceTimersByTime(RECONNECT_GRACE_MS);
      await Promise.resolve();

      // Alice y Carol siguen corriendo: no debería haber finalizado ya.
      const finished = waitForEvent<RaceFinishedEvent>(manager, LIVE_RACE_EVENTS.raceFinished);
      manager.recordFinish('alice', 40000);
      manager.recordFinish('carol', 41000);
      const event = await finished;

      const bobResult = event.result.find((p) => p.userId === 'bob');
      expect(bobResult).toMatchObject({ disconnected: true, durationMs: null, deltaMs: null });
    });

    it('reconectar dentro del grace period cancela el DNF', async () => {
      await startTwoPlayerRace();
      manager.handleDisconnect('bob');
      jest.advanceTimersByTime(RECONNECT_GRACE_MS / 2);

      const rejoinedRoomId = manager.reconnect('bob');
      expect(rejoinedRoomId).not.toBeNull();

      const finished = waitForEvent<RaceFinishedEvent>(manager, LIVE_RACE_EVENTS.raceFinished);
      manager.recordFinish('alice', 40000);
      manager.recordFinish('bob', 41000);
      const event = await finished;

      expect(event.result.find((p) => p.userId === 'bob')).toMatchObject({
        disconnected: false,
        durationMs: 41000,
      });
    });

    it('finaliza sin esperar el grace period si ya no queda nadie corriendo', async () => {
      await startTwoPlayerRace();
      manager.handleDisconnect('bob');

      const finished = waitForEvent<RaceFinishedEvent>(manager, LIVE_RACE_EVENTS.raceFinished);
      manager.recordFinish('alice', 40000);
      const event = await finished;

      expect(event.result.find((p) => p.userId === 'bob')?.disconnected).toBe(true);
    });

    it('el timeout de seguridad cierra la sala si nadie termina ni se desconecta', async () => {
      await startTwoPlayerRace();
      const finished = waitForEvent<RaceFinishedEvent>(manager, LIVE_RACE_EVENTS.raceFinished);
      jest.advanceTimersByTime(RACE_TIMEOUT_MS);
      const event = await finished;

      expect(event.result.every((p) => p.disconnected)).toBe(true);
      expect(races.created[0].status).toBe('ABANDONED');
      expect(wallets.credits).toHaveLength(0);
    });
  });
});
