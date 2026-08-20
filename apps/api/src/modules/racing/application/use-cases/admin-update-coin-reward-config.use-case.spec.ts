import { RacingCoinRewardConfig, RacingCoinRewardKey } from '../../domain/entities/racing-coin-reward-config.entity';
import { RacingCoinRewardConfigRepositoryPort } from '../ports/racing-coin-reward-config-repository.port';
import { AdminUpdateCoinRewardConfigUseCase } from './admin-update-coin-reward-config.use-case';

const EXISTING = new RacingCoinRewardConfig(
  RacingCoinRewardKey.PERSONAL_BEST,
  50,
);

class FakeRacingCoinRewardConfigRepository
  implements Partial<RacingCoinRewardConfigRepositoryPort>
{
  updated: { key: RacingCoinRewardKey; amount: number } | null = null;

  constructor(private readonly existing: RacingCoinRewardConfig | null) {}

  findByKey(): Promise<RacingCoinRewardConfig | null> {
    return Promise.resolve(this.existing);
  }

  update(key: RacingCoinRewardKey, amount: number): Promise<RacingCoinRewardConfig> {
    this.updated = { key, amount };
    return Promise.resolve(new RacingCoinRewardConfig(key, amount));
  }
}

describe('AdminUpdateCoinRewardConfigUseCase', () => {
  it('lanza RacingCoinRewardConfigNotFoundError si la clave no existe', async () => {
    const repo = new FakeRacingCoinRewardConfigRepository(null);
    const useCase = new AdminUpdateCoinRewardConfigUseCase(
      repo as unknown as RacingCoinRewardConfigRepositoryPort,
    );

    await expect(
      useCase.execute(RacingCoinRewardKey.PERSONAL_BEST, 75),
    ).rejects.toMatchObject({ code: 'RACING_COIN_REWARD_CONFIG_NOT_FOUND' });
  });

  it('ajusta el importe de una clave existente', async () => {
    const repo = new FakeRacingCoinRewardConfigRepository(EXISTING);
    const useCase = new AdminUpdateCoinRewardConfigUseCase(
      repo as unknown as RacingCoinRewardConfigRepositoryPort,
    );

    const result = await useCase.execute(RacingCoinRewardKey.PERSONAL_BEST, 75);

    expect(repo.updated).toEqual({
      key: RacingCoinRewardKey.PERSONAL_BEST,
      amount: 75,
    });
    expect(result.amount).toBe(75);
  });

  it('permite poner un importe a 0 para desactivar el bono', async () => {
    const repo = new FakeRacingCoinRewardConfigRepository(EXISTING);
    const useCase = new AdminUpdateCoinRewardConfigUseCase(
      repo as unknown as RacingCoinRewardConfigRepositoryPort,
    );

    await useCase.execute(RacingCoinRewardKey.PERSONAL_BEST, 0);

    expect(repo.updated).toEqual({
      key: RacingCoinRewardKey.PERSONAL_BEST,
      amount: 0,
    });
  });
});
