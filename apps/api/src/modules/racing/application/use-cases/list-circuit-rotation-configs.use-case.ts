import { Inject, Injectable } from '@nestjs/common';
import { RacingCircuitRotationConfig } from '../../domain/entities/racing-circuit-rotation-config.entity';
import {
  RACING_CIRCUIT_ROTATION_CONFIG_REPOSITORY,
  type RacingCircuitRotationConfigRepositoryPort,
} from '../ports/racing-circuit-rotation-config-repository.port';

@Injectable()
export class ListCircuitRotationConfigsUseCase {
  constructor(
    @Inject(RACING_CIRCUIT_ROTATION_CONFIG_REPOSITORY)
    private readonly configs: RacingCircuitRotationConfigRepositoryPort,
  ) {}

  execute(): Promise<RacingCircuitRotationConfig[]> {
    return this.configs.findAll();
  }
}
