import { Inject, Injectable } from '@nestjs/common';
import {
  RacingCircuitRotationConfig,
  RacingCircuitRotationConfigKey,
} from '../../domain/entities/racing-circuit-rotation-config.entity';
import { RacingCircuitRotationConfigNotFoundError } from '../../domain/errors/racing-circuit-rotation-config-not-found.error';
import {
  RACING_CIRCUIT_ROTATION_CONFIG_REPOSITORY,
  type RacingCircuitRotationConfigRepositoryPort,
} from '../ports/racing-circuit-rotation-config-repository.port';

@Injectable()
export class AdminUpdateCircuitRotationConfigUseCase {
  constructor(
    @Inject(RACING_CIRCUIT_ROTATION_CONFIG_REPOSITORY)
    private readonly configs: RacingCircuitRotationConfigRepositoryPort,
  ) {}

  async execute(
    key: RacingCircuitRotationConfigKey,
    value: number,
  ): Promise<RacingCircuitRotationConfig> {
    const existing = await this.configs.findByKey(key);
    if (!existing) throw new RacingCircuitRotationConfigNotFoundError(key);

    return this.configs.update(key, value);
  }
}
