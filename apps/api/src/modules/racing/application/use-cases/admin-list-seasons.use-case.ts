import { Inject, Injectable } from '@nestjs/common';
import { Season } from '../../domain/entities/season.entity';
import {
  SEASON_REPOSITORY,
  type SeasonRepositoryPort,
} from '../ports/season-repository.port';

@Injectable()
export class AdminListSeasonsUseCase {
  constructor(
    @Inject(SEASON_REPOSITORY) private readonly seasons: SeasonRepositoryPort,
  ) {}

  async execute(): Promise<Season[]> {
    return this.seasons.list();
  }
}
