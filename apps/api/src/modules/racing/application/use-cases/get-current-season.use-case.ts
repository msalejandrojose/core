import { Inject, Injectable } from '@nestjs/common';
import { Season } from '../../domain/entities/season.entity';
import {
  SEASON_REPOSITORY,
  type SeasonRepositoryPort,
} from '../ports/season-repository.port';

// Null es una respuesta normal, no un error: el feature puede estar
// desplegado sin que nadie haya creado todavía la primera temporada.
@Injectable()
export class GetCurrentSeasonUseCase {
  constructor(
    @Inject(SEASON_REPOSITORY) private readonly seasons: SeasonRepositoryPort,
  ) {}

  async execute(): Promise<Season | null> {
    return this.seasons.findCurrent();
  }
}
