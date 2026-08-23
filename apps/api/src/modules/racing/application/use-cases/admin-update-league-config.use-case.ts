import { Inject, Injectable } from '@nestjs/common';
import {
  RacingLeagueConfig,
  RacingLeagueConfigKey,
} from '../../domain/entities/racing-league-config.entity';
import { RacingLeagueConfigNotFoundError } from '../../domain/errors/racing-league-config-not-found.error';
import {
  RACING_LEAGUE_CONFIG_REPOSITORY,
  type RacingLeagueConfigRepositoryPort,
} from '../ports/racing-league-config-repository.port';

@Injectable()
export class AdminUpdateLeagueConfigUseCase {
  constructor(
    @Inject(RACING_LEAGUE_CONFIG_REPOSITORY)
    private readonly configs: RacingLeagueConfigRepositoryPort,
  ) {}

  async execute(
    key: RacingLeagueConfigKey,
    value: number,
  ): Promise<RacingLeagueConfig> {
    const existing = await this.configs.findByKey(key);
    if (!existing) throw new RacingLeagueConfigNotFoundError(key);

    return this.configs.update(key, value);
  }
}
