import { OnlineRace } from '../../domain/entities/online-race.entity';
import { OnlineRaceRepositoryPort } from '../ports/online-race-repository.port';
import { GetOnlineRaceUseCase } from './get-online-race.use-case';

class FakeOnlineRaceRepository implements Partial<OnlineRaceRepositoryPort> {
  constructor(private readonly race: OnlineRace | null) {}
  findById(): Promise<OnlineRace | null> {
    return Promise.resolve(this.race);
  }
}

describe('GetOnlineRaceUseCase', () => {
  it('rechaza una carrera que no existe', async () => {
    const uc = new GetOnlineRaceUseCase(
      new FakeOnlineRaceRepository(null) as unknown as OnlineRaceRepositoryPort,
    );
    await expect(uc.execute('no-existe')).rejects.toMatchObject({
      code: 'RACING_ONLINE_RACE_NOT_FOUND',
    });
  });

  it('devuelve la carrera tal cual la guardó el repositorio, sin recalcular', async () => {
    const race = new OnlineRace('race-1', 'player-1', 'track-1', new Date(), [
      {
        role: 'PLAYER',
        userId: 'player-1',
        durationMs: 42000,
        position: 1,
        deltaMs: 0,
      },
    ]);
    const uc = new GetOnlineRaceUseCase(
      new FakeOnlineRaceRepository(race) as unknown as OnlineRaceRepositoryPort,
    );
    await expect(uc.execute('race-1')).resolves.toBe(race);
  });
});
