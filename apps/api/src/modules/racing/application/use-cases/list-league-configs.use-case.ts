import { Inject, Injectable } from '@nestjs/common';
import { RacingLeagueConfig } from '../../domain/entities/racing-league-config.entity';
import {
  RACING_LEAGUE_CONFIG_REPOSITORY,
  type RacingLeagueConfigRepositoryPort,
} from '../ports/racing-league-config-repository.port';

// Un único listado sirve al backoffice para editar: son 7 filas, sin estado
// activo/inactivo que filtrar — mismo criterio que `ListCoinRewardConfigsUseCase`.
@Injectable()
export class ListLeagueConfigsUseCase {
  constructor(
    @Inject(RACING_LEAGUE_CONFIG_REPOSITORY)
    private readonly configs: RacingLeagueConfigRepositoryPort,
  ) {}

  execute(): Promise<RacingLeagueConfig[]> {
    return this.configs.findAll();
  }
}
