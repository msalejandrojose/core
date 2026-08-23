import { RacingCircuitRotationConfigKey } from '../../domain/entities/racing-circuit-rotation-config.entity';
import { RacingCircuitRepositoryPort } from '../ports/racing-circuit-repository.port';
import { RacingCircuitRotationConfigRepositoryPort } from '../ports/racing-circuit-rotation-config-repository.port';
import { AutoRotateCircuitsUseCase } from './auto-rotate-circuits.use-case';

class FakeRacingCircuitRepository implements Partial<RacingCircuitRepositoryPort> {
  applied: { selectedIds: readonly string[]; rotatedAt: Date } | null = null;

  constructor(
    private readonly candidates: string[],
    private readonly lastRotatedAt: Date | null,
  ) {}

  findActiveCandidateIds(): Promise<string[]> {
    return Promise.resolve(this.candidates);
  }

  findLastRotatedAt(): Promise<Date | null> {
    return Promise.resolve(this.lastRotatedAt);
  }

  applyRotation(selectedIds: readonly string[], rotatedAt: Date): Promise<void> {
    this.applied = { selectedIds, rotatedAt };
    return Promise.resolve();
  }
}

class FakeRacingCircuitRotationConfigRepository
  implements Partial<RacingCircuitRotationConfigRepositoryPort>
{
  constructor(private readonly circuitsPerDay: number) {}

  getValues(): Promise<ReadonlyMap<RacingCircuitRotationConfigKey, number>> {
    return Promise.resolve(
      new Map([[RacingCircuitRotationConfigKey.CIRCUITS_PER_DAY, this.circuitsPerDay]]),
    );
  }
}

function buildUseCase(candidates: string[], lastRotatedAt: Date | null, circuitsPerDay = 2) {
  const circuits = new FakeRacingCircuitRepository(candidates, lastRotatedAt);
  const useCase = new AutoRotateCircuitsUseCase(
    circuits as unknown as RacingCircuitRepositoryPort,
    new FakeRacingCircuitRotationConfigRepository(
      circuitsPerDay,
    ) as unknown as RacingCircuitRotationConfigRepositoryPort,
  );
  return { useCase, circuits };
}

describe('AutoRotateCircuitsUseCase', () => {
  it('no hace nada si ya rotó hoy y no se fuerza', async () => {
    const now = new Date('2026-01-02T12:00:00Z');
    const { useCase, circuits } = buildUseCase(
      ['a', 'b', 'c'],
      new Date('2026-01-02T00:00:01Z'),
    );

    await useCase.execute(now);

    expect(circuits.applied).toBeNull();
  });

  it('rota si nunca ha rotado, seleccionando circuitsPerDay candidatos', async () => {
    const now = new Date('2026-01-02T12:00:00Z');
    const { useCase, circuits } = buildUseCase(['a', 'b', 'c', 'd'], null, 2);

    await useCase.execute(now);

    expect(circuits.applied).not.toBeNull();
    expect(circuits.applied?.selectedIds).toHaveLength(2);
    expect(circuits.applied?.rotatedAt).toEqual(now);
  });

  it('rota aunque ya haya rotado hoy si se fuerza', async () => {
    const now = new Date('2026-01-02T12:00:00Z');
    const { useCase, circuits } = buildUseCase(
      ['a', 'b'],
      new Date('2026-01-02T00:00:01Z'),
      1,
    );

    await useCase.execute(now, { force: true });

    expect(circuits.applied).not.toBeNull();
    expect(circuits.applied?.selectedIds).toHaveLength(1);
  });

  it('rota si el último día fue distinto', async () => {
    const now = new Date('2026-01-02T00:01:00Z');
    const { useCase, circuits } = buildUseCase(['a', 'b'], new Date('2026-01-01T23:59:00Z'), 1);

    await useCase.execute(now);

    expect(circuits.applied).not.toBeNull();
  });
});
