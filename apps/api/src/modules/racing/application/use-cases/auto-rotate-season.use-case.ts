import { Inject, Injectable } from '@nestjs/common';
import { nextSeasonName, seasonNeedsRotation } from '../../domain/season-rotation-policy';
import {
  SEASON_REPOSITORY,
  type SeasonRepositoryPort,
} from '../ports/season-repository.port';
import { AdminCreateSeasonUseCase } from './admin-create-season.use-case';

// El "nadie lo hace a mano" de TASK-228: lo llama el scheduler cada hora, no
// una pantalla de admin. Reutiliza AdminCreateSeasonUseCase tal cual —
// "rotar" no es más que "crear la siguiente con el nombre que toca", y esa
// ya sabe cerrar la anterior en el mismo instante.
//
// También cubre el arranque: sin ninguna temporada todavía (primera vez que
// corre esto en un entorno nuevo), crea la primera — ni siquiera esa
// necesita que un admin la dé de alta a mano.
@Injectable()
export class AutoRotateSeasonUseCase {
  constructor(
    @Inject(SEASON_REPOSITORY) private readonly seasons: SeasonRepositoryPort,
    private readonly createSeason: AdminCreateSeasonUseCase,
  ) {}

  async execute(now: Date = new Date()): Promise<void> {
    const current = await this.seasons.findCurrent();

    if (current === null) {
      await this.createSeason.execute({ name: nextSeasonName(null), startsAt: now });
      return;
    }

    if (seasonNeedsRotation(current, now)) {
      await this.createSeason.execute({
        name: nextSeasonName(current),
        startsAt: now,
      });
    }
  }
}
