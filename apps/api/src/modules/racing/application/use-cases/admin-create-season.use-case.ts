import { Inject, Injectable } from '@nestjs/common';
import { Season } from '../../domain/entities/season.entity';
import {
  SEASON_REPOSITORY,
  type SeasonRepositoryPort,
} from '../ports/season-repository.port';

export interface CreateSeasonInput {
  name: string;
  /** Por defecto, ahora mismo: crear una temporada casi siempre es "empieza
   *  ya la siguiente", no programar una futura. */
  startsAt?: Date;
}

// Crea una temporada nueva y cierra la que estuviera abierta justo en el
// instante en que empieza esta (TASK-227). Así se mantiene sin esfuerzo el
// invariante "como mucho una temporada abierta a la vez" sin necesitar un
// endpoint aparte de "cerrar" que alguien pueda olvidar llamar y dejar dos
// temporadas abiertas a la vez.
@Injectable()
export class AdminCreateSeasonUseCase {
  constructor(
    @Inject(SEASON_REPOSITORY) private readonly seasons: SeasonRepositoryPort,
  ) {}

  async execute(input: CreateSeasonInput): Promise<Season> {
    const startsAt = input.startsAt ?? new Date();

    const current = await this.seasons.findCurrent();
    if (current !== null) {
      await this.seasons.close(current.id, startsAt);
    }

    return this.seasons.create({ name: input.name, startsAt });
  }
}
