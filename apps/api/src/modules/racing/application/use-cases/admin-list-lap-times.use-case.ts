import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import {
  AdminLapTimeListEntry,
  AdminListLapTimesOptions,
  LAP_TIME_REPOSITORY,
  type LapTimeRepositoryPort,
} from '../ports/lap-time-repository.port';

// A diferencia del leaderboard (top N + posición del jugador), este lista
// TODOS los intentos —válidos e inválidos— con paginación offset, para el
// backoffice (TASK-246).
@Injectable()
export class AdminListLapTimesUseCase {
  constructor(
    @Inject(LAP_TIME_REPOSITORY)
    private readonly lapTimes: LapTimeRepositoryPort,
  ) {}

  execute(
    opts: AdminListLapTimesOptions,
  ): Promise<PaginatedResult<AdminLapTimeListEntry>> {
    return this.lapTimes.listAllAdmin(opts);
  }
}
