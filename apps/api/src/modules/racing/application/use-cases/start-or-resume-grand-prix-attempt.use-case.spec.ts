import { GrandPrixAttempt } from '../../domain/entities/grand-prix-attempt.entity';
import {
  GrandPrix,
  GrandPrixStage,
} from '../../domain/entities/grand-prix.entity';
import { GrandPrixAttemptRepositoryPort } from '../ports/grand-prix-attempt-repository.port';
import { GrandPrixRepositoryPort } from '../ports/grand-prix-repository.port';
import { StartOrResumeGrandPrixAttemptUseCase } from './start-or-resume-grand-prix-attempt.use-case';

const GP = new GrandPrix('gp-1', 'copa-verano', 'Copa de Verano', true, [
  new GrandPrixStage('track-1', 'kenney-01', 'Kenney', 0),
  new GrandPrixStage('track-2', 'kenney-02', 'Otro', 1),
]);

class FakeGrandPrixRepository implements Partial<GrandPrixRepositoryPort> {
  constructor(private readonly grandPrix: GrandPrix | null) {}
  findById(): Promise<GrandPrix | null> {
    return Promise.resolve(this.grandPrix);
  }
}

class FakeAttemptRepository implements Partial<GrandPrixAttemptRepositoryPort> {
  readonly startCalls: { userId: string; grandPrixId: string }[] = [];
  constructor(private readonly inProgress: GrandPrixAttempt | null) {}

  findInProgress(): Promise<GrandPrixAttempt | null> {
    return Promise.resolve(this.inProgress);
  }
  start(userId: string, grandPrixId: string): Promise<GrandPrixAttempt> {
    this.startCalls.push({ userId, grandPrixId });
    return Promise.resolve(
      new GrandPrixAttempt(
        'attempt-new',
        userId,
        grandPrixId,
        'IN_PROGRESS',
        null,
        new Date(),
        null,
        [],
      ),
    );
  }
}

function useCase(
  grandPrix: GrandPrix | null,
  inProgress: GrandPrixAttempt | null,
) {
  const attempts = new FakeAttemptRepository(inProgress);
  return {
    useCase: new StartOrResumeGrandPrixAttemptUseCase(
      new FakeGrandPrixRepository(
        grandPrix,
      ) as unknown as GrandPrixRepositoryPort,
      attempts as unknown as GrandPrixAttemptRepositoryPort,
    ),
    attempts,
  };
}

describe('StartOrResumeGrandPrixAttemptUseCase', () => {
  it('rechaza un Grand Prix que no existe', async () => {
    const { useCase: uc } = useCase(null, null);
    await expect(uc.execute('user-1', 'gp-1')).rejects.toMatchObject({
      code: 'RACING_GRAND_PRIX_NOT_FOUND',
    });
  });

  it('rechaza un Grand Prix inactivo, igual que si no existiera', async () => {
    const inactive = new GrandPrix(GP.id, GP.slug, GP.name, false, GP.stages);
    const { useCase: uc } = useCase(inactive, null);
    await expect(uc.execute('user-1', 'gp-1')).rejects.toMatchObject({
      code: 'RACING_GRAND_PRIX_NOT_FOUND',
    });
  });

  it('reanuda el intento en curso en vez de crear uno nuevo', async () => {
    const existing = new GrandPrixAttempt(
      'attempt-1',
      'user-1',
      'gp-1',
      'IN_PROGRESS',
      null,
      new Date(),
      null,
      [],
    );
    const { useCase: uc, attempts } = useCase(GP, existing);

    const result = await uc.execute('user-1', 'gp-1');

    expect(result.id).toBe('attempt-1');
    expect(attempts.startCalls).toHaveLength(0);
  });

  it('crea un intento nuevo cuando no hay ninguno en curso', async () => {
    const { useCase: uc, attempts } = useCase(GP, null);

    const result = await uc.execute('user-1', 'gp-1');

    expect(result.id).toBe('attempt-new');
    expect(attempts.startCalls).toEqual([
      { userId: 'user-1', grandPrixId: 'gp-1' },
    ]);
  });
});
