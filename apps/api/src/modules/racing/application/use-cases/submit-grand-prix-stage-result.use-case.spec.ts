import {
  GrandPrixAttempt,
  GrandPrixStageResult,
} from '../../domain/entities/grand-prix-attempt.entity';
import {
  GrandPrix,
  GrandPrixStage,
} from '../../domain/entities/grand-prix.entity';
import { GrandPrixAttemptRepositoryPort } from '../ports/grand-prix-attempt-repository.port';
import { GrandPrixRepositoryPort } from '../ports/grand-prix-repository.port';
import { SubmitGrandPrixStageResultUseCase } from './submit-grand-prix-stage-result.use-case';

const GP = new GrandPrix('gp-1', 'copa-verano', 'Copa de Verano', true, [
  new GrandPrixStage('track-1', 'kenney-01', 'Kenney', 0),
  new GrandPrixStage('track-2', 'kenney-02', 'Otro', 1),
]);

function attemptWithResults(results: GrandPrixStageResult[]): GrandPrixAttempt {
  return new GrandPrixAttempt(
    'attempt-1',
    'user-1',
    'gp-1',
    'IN_PROGRESS',
    null,
    new Date('2026-01-01T00:00:00Z'),
    null,
    results,
  );
}

class FakeGrandPrixRepository implements Partial<GrandPrixRepositoryPort> {
  constructor(private readonly grandPrix: GrandPrix | null) {}
  findById(): Promise<GrandPrix | null> {
    return Promise.resolve(this.grandPrix);
  }
}

class FakeAttemptRepository implements Partial<GrandPrixAttemptRepositoryPort> {
  readonly addStageResultCalls: {
    attemptId: string;
    trackId: string;
    durationMs: number;
  }[] = [];
  readonly completeCalls: { attemptId: string; totalDurationMs: number }[] = [];

  constructor(private attempt: GrandPrixAttempt | null) {}

  findInProgress(): Promise<GrandPrixAttempt | null> {
    return Promise.resolve(this.attempt);
  }

  addStageResult(
    attemptId: string,
    trackId: string,
    durationMs: number,
  ): Promise<GrandPrixAttempt> {
    this.addStageResultCalls.push({ attemptId, trackId, durationMs });
    const updated = attemptWithResults([
      ...this.attempt!.results,
      new GrandPrixStageResult(trackId, durationMs, new Date()),
    ]);
    this.attempt = updated;
    return Promise.resolve(updated);
  }

  complete(
    attemptId: string,
    totalDurationMs: number,
  ): Promise<GrandPrixAttempt> {
    this.completeCalls.push({ attemptId, totalDurationMs });
    return Promise.resolve(
      new GrandPrixAttempt(
        attemptId,
        'user-1',
        'gp-1',
        'COMPLETED',
        totalDurationMs,
        this.attempt!.startedAt,
        new Date(),
        this.attempt!.results,
      ),
    );
  }
}

function useCase(
  grandPrix: GrandPrix | null,
  attempt: GrandPrixAttempt | null,
) {
  const attempts = new FakeAttemptRepository(attempt);
  return {
    useCase: new SubmitGrandPrixStageResultUseCase(
      new FakeGrandPrixRepository(
        grandPrix,
      ) as unknown as GrandPrixRepositoryPort,
      attempts as unknown as GrandPrixAttemptRepositoryPort,
    ),
    attempts,
  };
}

describe('SubmitGrandPrixStageResultUseCase', () => {
  it('rechaza un Grand Prix que no existe', async () => {
    const { useCase: uc } = useCase(null, null);
    await expect(
      uc.execute({
        userId: 'user-1',
        grandPrixId: 'gp-1',
        trackId: 'track-1',
        durationMs: 9000,
      }),
    ).rejects.toMatchObject({ code: 'RACING_GRAND_PRIX_NOT_FOUND' });
  });

  it('rechaza si no hay un intento en curso', async () => {
    const { useCase: uc } = useCase(GP, null);
    await expect(
      uc.execute({
        userId: 'user-1',
        grandPrixId: 'gp-1',
        trackId: 'track-1',
        durationMs: 9000,
      }),
    ).rejects.toMatchObject({
      code: 'RACING_GRAND_PRIX_ATTEMPT_NOT_IN_PROGRESS',
    });
  });

  it('rechaza el resultado de un circuito que no es la siguiente manga pendiente', async () => {
    const { useCase: uc } = useCase(GP, attemptWithResults([]));
    await expect(
      uc.execute({
        userId: 'user-1',
        grandPrixId: 'gp-1',
        trackId: 'track-2', // la primera manga pendiente es track-1
        durationMs: 9000,
      }),
    ).rejects.toMatchObject({
      code: 'RACING_GRAND_PRIX_ATTEMPT_STAGE_MISMATCH',
      context: { expectedTrackId: 'track-1' },
    });
  });

  it('guarda el resultado y sigue en curso cuando no es la última manga', async () => {
    const { useCase: uc, attempts } = useCase(GP, attemptWithResults([]));

    const result = await uc.execute({
      userId: 'user-1',
      grandPrixId: 'gp-1',
      trackId: 'track-1',
      durationMs: 9000,
    });

    expect(attempts.addStageResultCalls).toEqual([
      { attemptId: 'attempt-1', trackId: 'track-1', durationMs: 9000 },
    ]);
    expect(attempts.completeCalls).toHaveLength(0);
    expect(result.status).toBe('IN_PROGRESS');
  });

  it('completa el intento sumando los tiempos cuando se sube la última manga', async () => {
    const existing = attemptWithResults([
      new GrandPrixStageResult('track-1', 9000, new Date()),
    ]);
    const { useCase: uc, attempts } = useCase(GP, existing);

    const result = await uc.execute({
      userId: 'user-1',
      grandPrixId: 'gp-1',
      trackId: 'track-2',
      durationMs: 11000,
    });

    expect(attempts.completeCalls).toEqual([
      { attemptId: 'attempt-1', totalDurationMs: 20000 },
    ]);
    expect(result.status).toBe('COMPLETED');
    expect(result.totalDurationMs).toBe(20000);
  });
});
