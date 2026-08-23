import {
  RacingCircuitRotationConfig,
  RacingCircuitRotationConfigKey,
} from '../../domain/entities/racing-circuit-rotation-config.entity';
import { RacingCircuitRotationConfigRepositoryPort } from '../ports/racing-circuit-rotation-config-repository.port';
import { AdminUpdateCircuitRotationConfigUseCase } from './admin-update-circuit-rotation-config.use-case';

const EXISTING = new RacingCircuitRotationConfig(
  RacingCircuitRotationConfigKey.CIRCUITS_PER_DAY,
  2,
);

class FakeRacingCircuitRotationConfigRepository
  implements Partial<RacingCircuitRotationConfigRepositoryPort>
{
  updated: { key: RacingCircuitRotationConfigKey; value: number } | null = null;

  constructor(private readonly existing: RacingCircuitRotationConfig | null) {}

  findByKey(): Promise<RacingCircuitRotationConfig | null> {
    return Promise.resolve(this.existing);
  }

  update(
    key: RacingCircuitRotationConfigKey,
    value: number,
  ): Promise<RacingCircuitRotationConfig> {
    this.updated = { key, value };
    return Promise.resolve(new RacingCircuitRotationConfig(key, value));
  }
}

describe('AdminUpdateCircuitRotationConfigUseCase', () => {
  it('lanza RacingCircuitRotationConfigNotFoundError si la clave no existe', async () => {
    const repo = new FakeRacingCircuitRotationConfigRepository(null);
    const useCase = new AdminUpdateCircuitRotationConfigUseCase(
      repo as unknown as RacingCircuitRotationConfigRepositoryPort,
    );

    await expect(
      useCase.execute(RacingCircuitRotationConfigKey.CIRCUITS_PER_DAY, 3),
    ).rejects.toMatchObject({ code: 'RACING_CIRCUIT_ROTATION_CONFIG_NOT_FOUND' });
  });

  it('ajusta el valor de una clave existente', async () => {
    const repo = new FakeRacingCircuitRotationConfigRepository(EXISTING);
    const useCase = new AdminUpdateCircuitRotationConfigUseCase(
      repo as unknown as RacingCircuitRotationConfigRepositoryPort,
    );

    const result = await useCase.execute(
      RacingCircuitRotationConfigKey.CIRCUITS_PER_DAY,
      3,
    );

    expect(repo.updated).toEqual({
      key: RacingCircuitRotationConfigKey.CIRCUITS_PER_DAY,
      value: 3,
    });
    expect(result.value).toBe(3);
  });
});
