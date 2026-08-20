import { Inject, Injectable } from '@nestjs/common';
import {
  RacingCoinRewardConfig,
  RacingCoinRewardKey,
} from '../../domain/entities/racing-coin-reward-config.entity';
import { RacingCoinRewardConfigNotFoundError } from '../../domain/errors/racing-coin-reward-config-not-found.error';
import {
  RACING_COIN_REWARD_CONFIG_REPOSITORY,
  type RacingCoinRewardConfigRepositoryPort,
} from '../ports/racing-coin-reward-config-repository.port';

@Injectable()
export class AdminUpdateCoinRewardConfigUseCase {
  constructor(
    @Inject(RACING_COIN_REWARD_CONFIG_REPOSITORY)
    private readonly configs: RacingCoinRewardConfigRepositoryPort,
  ) {}

  async execute(
    key: RacingCoinRewardKey,
    amount: number,
  ): Promise<RacingCoinRewardConfig> {
    const existing = await this.configs.findByKey(key);
    if (!existing) throw new RacingCoinRewardConfigNotFoundError(key);

    return this.configs.update(key, amount);
  }
}
