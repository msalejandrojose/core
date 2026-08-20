import { Inject, Injectable } from '@nestjs/common';
import {
  RacingMatchmakingConfig,
  RacingMatchmakingConfigKey,
} from '../../domain/entities/racing-matchmaking-config.entity';
import { RacingMatchmakingConfigNotFoundError } from '../../domain/errors/racing-matchmaking-config-not-found.error';
import {
  RACING_MATCHMAKING_CONFIG_REPOSITORY,
  type RacingMatchmakingConfigRepositoryPort,
} from '../ports/racing-matchmaking-config-repository.port';

@Injectable()
export class AdminUpdateMatchmakingConfigUseCase {
  constructor(
    @Inject(RACING_MATCHMAKING_CONFIG_REPOSITORY)
    private readonly configs: RacingMatchmakingConfigRepositoryPort,
  ) {}

  async execute(
    key: RacingMatchmakingConfigKey,
    value: number,
  ): Promise<RacingMatchmakingConfig> {
    const existing = await this.configs.findByKey(key);
    if (!existing) throw new RacingMatchmakingConfigNotFoundError(key);

    return this.configs.update(key, value);
  }
}
