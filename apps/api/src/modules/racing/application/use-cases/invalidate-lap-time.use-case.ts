import { Inject, Injectable } from '@nestjs/common';
import { LapTime } from '../../domain/entities/lap-time.entity';
import { LapTimeNotFoundError } from '../../domain/errors/lap-time-not-found.error';
import {
  LAP_TIME_REPOSITORY,
  type LapTimeRepositoryPort,
} from '../ports/lap-time-repository.port';

// Anula un tiempo sin borrarlo (TASK-239): queda constancia, y sale del
// leaderboard, la posición y la mejor marca personal.
@Injectable()
export class InvalidateLapTimeUseCase {
  constructor(
    @Inject(LAP_TIME_REPOSITORY)
    private readonly lapTimes: LapTimeRepositoryPort,
  ) {}

  async execute(id: string): Promise<LapTime> {
    const existing = await this.lapTimes.findById(id);
    if (!existing) throw new LapTimeNotFoundError(id);
    return this.lapTimes.invalidate(id);
  }
}
