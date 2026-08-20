import { Inject, Injectable } from '@nestjs/common';
import { RacingCoinRewardConfig } from '../../domain/entities/racing-coin-reward-config.entity';
import {
  RACING_COIN_REWARD_CONFIG_REPOSITORY,
  type RacingCoinRewardConfigRepositoryPort,
} from '../ports/racing-coin-reward-config-repository.port';

// Un único listado sirve al backoffice para editar: son 9 filas, sin estado
// activo/inactivo que filtrar (TASK-322) — mismo criterio que
// `ListTerrainEffectsUseCase`.
@Injectable()
export class ListCoinRewardConfigsUseCase {
  constructor(
    @Inject(RACING_COIN_REWARD_CONFIG_REPOSITORY)
    private readonly configs: RacingCoinRewardConfigRepositoryPort,
  ) {}

  execute(): Promise<RacingCoinRewardConfig[]> {
    return this.configs.findAll();
  }
}
