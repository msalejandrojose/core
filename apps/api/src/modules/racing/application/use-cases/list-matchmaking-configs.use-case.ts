import { Inject, Injectable } from '@nestjs/common';
import { RacingMatchmakingConfig } from '../../domain/entities/racing-matchmaking-config.entity';
import {
  RACING_MATCHMAKING_CONFIG_REPOSITORY,
  type RacingMatchmakingConfigRepositoryPort,
} from '../ports/racing-matchmaking-config-repository.port';

// Un único listado sirve al backoffice para editar: son 3 filas, sin estado
// activo/inactivo que filtrar (TASK-323, tarea 8) — mismo criterio que
// `ListCoinRewardConfigsUseCase`.
@Injectable()
export class ListMatchmakingConfigsUseCase {
  constructor(
    @Inject(RACING_MATCHMAKING_CONFIG_REPOSITORY)
    private readonly configs: RacingMatchmakingConfigRepositoryPort,
  ) {}

  execute(): Promise<RacingMatchmakingConfig[]> {
    return this.configs.findAll();
  }
}
