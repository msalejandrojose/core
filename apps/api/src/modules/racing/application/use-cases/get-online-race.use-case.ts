import { Inject, Injectable } from '@nestjs/common';
import { OnlineRace } from '../../domain/entities/online-race.entity';
import { OnlineRaceNotFoundError } from '../../domain/errors/online-race-not-found.error';
import {
  ONLINE_RACE_REPOSITORY,
  type OnlineRaceRepositoryPort,
} from '../ports/online-race-repository.port';

// Reconstruye el podio de una carrera pasada SIN recalcular nada (criterio
// de done de TASK-283): posición y delta ya quedaron fijados al registrarla.
@Injectable()
export class GetOnlineRaceUseCase {
  constructor(
    @Inject(ONLINE_RACE_REPOSITORY)
    private readonly races: OnlineRaceRepositoryPort,
  ) {}

  async execute(id: string): Promise<OnlineRace> {
    const race = await this.races.findById(id);
    if (!race) throw new OnlineRaceNotFoundError(id);
    return race;
  }
}
