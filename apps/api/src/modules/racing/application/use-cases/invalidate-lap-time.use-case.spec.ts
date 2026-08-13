import {
  LapTime,
  LeaderboardEntry,
} from '../../domain/entities/lap-time.entity';
import { LapTimeRepositoryPort } from '../ports/lap-time-repository.port';
import { InvalidateLapTimeUseCase } from './invalidate-lap-time.use-case';

const EXISTING = new LapTime(
  'lap-1',
  'user-1',
  'track-1',
  42350,
  [10120, 21400, 33900, 42350],
  '0.1.0',
  new Date('2026-08-13T10:00:00.000Z'),
  null,
);

class FakeLapTimeRepository implements LapTimeRepositoryPort {
  invalidated: string | null = null;

  constructor(private readonly existing: LapTime | null) {}

  create(): Promise<never> {
    throw new Error('not used in this test');
  }
  findById(): Promise<LapTime | null> {
    return Promise.resolve(this.existing);
  }
  invalidate(id: string): Promise<LapTime> {
    this.invalidated = id;
    const existing = this.existing as LapTime;
    return Promise.resolve(
      new LapTime(
        existing.id,
        existing.userId,
        existing.trackId,
        existing.durationMs,
        existing.splitsMs,
        existing.clientVersion,
        existing.createdAt,
        new Date('2026-08-13T12:00:00.000Z'),
      ),
    );
  }
  findPersonalBest(): Promise<LapTime | null> {
    throw new Error('not used in this test');
  }
  findLastAttemptAt(): Promise<Date | null> {
    throw new Error('not used in this test');
  }
  leaderboard(): Promise<LeaderboardEntry[]> {
    throw new Error('not used in this test');
  }
  positionOf(): Promise<number | null> {
    throw new Error('not used in this test');
  }
}

describe('InvalidateLapTimeUseCase', () => {
  it('lanza LapTimeNotFoundError si el tiempo no existe', async () => {
    const repo = new FakeLapTimeRepository(null);
    const useCase = new InvalidateLapTimeUseCase(repo);

    await expect(useCase.execute('missing-id')).rejects.toMatchObject({
      code: 'RACING_LAP_TIME_NOT_FOUND',
    });
  });

  it('anula el tiempo existente y devuelve invalidatedAt', async () => {
    const repo = new FakeLapTimeRepository(EXISTING);
    const useCase = new InvalidateLapTimeUseCase(repo);

    const result = await useCase.execute('lap-1');

    expect(repo.invalidated).toBe('lap-1');
    expect(result.invalidatedAt).not.toBeNull();
  });
});
