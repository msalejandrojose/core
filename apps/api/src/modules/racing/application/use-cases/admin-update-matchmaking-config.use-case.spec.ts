import {
  RacingMatchmakingConfig,
  RacingMatchmakingConfigKey,
} from '../../domain/entities/racing-matchmaking-config.entity';
import { RacingMatchmakingConfigRepositoryPort } from '../ports/racing-matchmaking-config-repository.port';
import { AdminUpdateMatchmakingConfigUseCase } from './admin-update-matchmaking-config.use-case';

const EXISTING = new RacingMatchmakingConfig(
  RacingMatchmakingConfigKey.RATING_K_FACTOR,
  32,
);

class FakeRacingMatchmakingConfigRepository
  implements Partial<RacingMatchmakingConfigRepositoryPort>
{
  updated: { key: RacingMatchmakingConfigKey; value: number } | null = null;

  constructor(private readonly existing: RacingMatchmakingConfig | null) {}

  findByKey(): Promise<RacingMatchmakingConfig | null> {
    return Promise.resolve(this.existing);
  }

  update(key: RacingMatchmakingConfigKey, value: number): Promise<RacingMatchmakingConfig> {
    this.updated = { key, value };
    return Promise.resolve(new RacingMatchmakingConfig(key, value));
  }
}

describe('AdminUpdateMatchmakingConfigUseCase', () => {
  it('lanza RacingMatchmakingConfigNotFoundError si la clave no existe', async () => {
    const repo = new FakeRacingMatchmakingConfigRepository(null);
    const useCase = new AdminUpdateMatchmakingConfigUseCase(
      repo as unknown as RacingMatchmakingConfigRepositoryPort,
    );

    await expect(
      useCase.execute(RacingMatchmakingConfigKey.RATING_K_FACTOR, 40),
    ).rejects.toMatchObject({ code: 'RACING_MATCHMAKING_CONFIG_NOT_FOUND' });
  });

  it('ajusta el valor de una clave existente', async () => {
    const repo = new FakeRacingMatchmakingConfigRepository(EXISTING);
    const useCase = new AdminUpdateMatchmakingConfigUseCase(
      repo as unknown as RacingMatchmakingConfigRepositoryPort,
    );

    const result = await useCase.execute(RacingMatchmakingConfigKey.RATING_K_FACTOR, 40);

    expect(repo.updated).toEqual({
      key: RacingMatchmakingConfigKey.RATING_K_FACTOR,
      value: 40,
    });
    expect(result.value).toBe(40);
  });

  it('permite poner un valor a 0', async () => {
    const repo = new FakeRacingMatchmakingConfigRepository(EXISTING);
    const useCase = new AdminUpdateMatchmakingConfigUseCase(
      repo as unknown as RacingMatchmakingConfigRepositoryPort,
    );

    await useCase.execute(RacingMatchmakingConfigKey.RATING_K_FACTOR, 0);

    expect(repo.updated).toEqual({
      key: RacingMatchmakingConfigKey.RATING_K_FACTOR,
      value: 0,
    });
  });
});
