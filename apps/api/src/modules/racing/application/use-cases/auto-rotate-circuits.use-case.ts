import { Inject, Injectable } from '@nestjs/common';
import { RacingCircuitRotationConfigKey } from '../../domain/entities/racing-circuit-rotation-config.entity';
import {
  circuitRotationNeedsRotation,
  selectCircuitsForRotation,
} from '../../domain/racing-circuit-rotation-policy';
import {
  RACING_CIRCUIT_REPOSITORY,
  type RacingCircuitRepositoryPort,
} from '../ports/racing-circuit-repository.port';
import {
  RACING_CIRCUIT_ROTATION_CONFIG_REPOSITORY,
  type RacingCircuitRotationConfigRepositoryPort,
} from '../ports/racing-circuit-rotation-config-repository.port';

const DEFAULT_CIRCUITS_PER_DAY = 2;

// El "nadie lo hace a mano" de TASK-336, análogo a `AutoRotateSeasonUseCase`:
// lo llama el scheduler cada hora, no una pantalla de admin. `force` existe
// para poder disparar una rotación ya desde el backoffice (verificación/
// operación), saltándose la comprobación de "¿ya rotó hoy?".
@Injectable()
export class AutoRotateCircuitsUseCase {
  constructor(
    @Inject(RACING_CIRCUIT_REPOSITORY)
    private readonly circuits: RacingCircuitRepositoryPort,
    @Inject(RACING_CIRCUIT_ROTATION_CONFIG_REPOSITORY)
    private readonly configs: RacingCircuitRotationConfigRepositoryPort,
  ) {}

  async execute(now: Date = new Date(), opts?: { force?: boolean }): Promise<void> {
    const lastRotatedAt = await this.circuits.findLastRotatedAt();
    if (!opts?.force && !circuitRotationNeedsRotation(lastRotatedAt, now)) {
      return;
    }

    const values = await this.configs.getValues();
    const circuitsPerDay =
      values.get(RacingCircuitRotationConfigKey.CIRCUITS_PER_DAY) ??
      DEFAULT_CIRCUITS_PER_DAY;

    const candidates = await this.circuits.findActiveCandidateIds();
    const selected = selectCircuitsForRotation(candidates, circuitsPerDay);

    await this.circuits.applyRotation(selected, now);
  }
}
