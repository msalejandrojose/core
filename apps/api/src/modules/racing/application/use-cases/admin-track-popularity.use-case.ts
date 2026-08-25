import { Inject, Injectable } from '@nestjs/common';
import {
  AdminTrackPopularityEntry,
  LAP_TIME_REPOSITORY,
  type LapTimeRepositoryPort,
} from '../ports/lap-time-repository.port';

// Reporte de qué circuitos se juegan y cuáles se abandonan, para el
// backoffice (TASK-240). Sin paginación: el número de circuitos es pequeño
// y estable, a diferencia de los intentos individuales.
@Injectable()
export class AdminTrackPopularityUseCase {
  constructor(
    @Inject(LAP_TIME_REPOSITORY)
    private readonly lapTimes: LapTimeRepositoryPort,
  ) {}

  execute(): Promise<AdminTrackPopularityEntry[]> {
    return this.lapTimes.trackPopularity();
  }
}
