import {
  RacingLeagueConfig,
  RacingLeagueConfigKey,
} from '../../domain/entities/racing-league-config.entity';
import { RacingLeagueConfigRepositoryPort } from '../ports/racing-league-config-repository.port';
import { AdminUpdateLeagueConfigUseCase } from './admin-update-league-config.use-case';

const EXISTING = new RacingLeagueConfig(
  RacingLeagueConfigKey.TIER_SILVER_THRESHOLD,
  50,
);

class FakeRacingLeagueConfigRepository
  implements Partial<RacingLeagueConfigRepositoryPort>
{
  updated: { key: RacingLeagueConfigKey; value: number } | null = null;

  constructor(private readonly existing: RacingLeagueConfig | null) {}

  findByKey(): Promise<RacingLeagueConfig | null> {
    return Promise.resolve(this.existing);
  }

  update(key: RacingLeagueConfigKey, value: number): Promise<RacingLeagueConfig> {
    this.updated = { key, value };
    return Promise.resolve(new RacingLeagueConfig(key, value));
  }
}

describe('AdminUpdateLeagueConfigUseCase', () => {
  it('lanza RacingLeagueConfigNotFoundError si la clave no existe', async () => {
    const repo = new FakeRacingLeagueConfigRepository(null);
    const useCase = new AdminUpdateLeagueConfigUseCase(
      repo as unknown as RacingLeagueConfigRepositoryPort,
    );

    await expect(
      useCase.execute(RacingLeagueConfigKey.TIER_SILVER_THRESHOLD, 75),
    ).rejects.toMatchObject({ code: 'RACING_LEAGUE_CONFIG_NOT_FOUND' });
  });

  it('ajusta el valor de una clave existente', async () => {
    const repo = new FakeRacingLeagueConfigRepository(EXISTING);
    const useCase = new AdminUpdateLeagueConfigUseCase(
      repo as unknown as RacingLeagueConfigRepositoryPort,
    );

    const result = await useCase.execute(
      RacingLeagueConfigKey.TIER_SILVER_THRESHOLD,
      75,
    );

    expect(repo.updated).toEqual({
      key: RacingLeagueConfigKey.TIER_SILVER_THRESHOLD,
      value: 75,
    });
    expect(result.value).toBe(75);
  });
});
