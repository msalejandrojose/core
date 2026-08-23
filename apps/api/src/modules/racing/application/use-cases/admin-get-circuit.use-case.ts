import { Inject, Injectable } from '@nestjs/common';
import { RacingCircuit } from '../../domain/entities/racing-circuit.entity';
import { TrackNotFoundError } from '../../domain/errors/track-not-found.error';
import {
  RACING_CIRCUIT_REPOSITORY,
  type RacingCircuitRepositoryPort,
} from '../ports/racing-circuit-repository.port';

@Injectable()
export class AdminGetCircuitUseCase {
  constructor(
    @Inject(RACING_CIRCUIT_REPOSITORY)
    private readonly circuits: RacingCircuitRepositoryPort,
  ) {}

  async execute(id: string): Promise<RacingCircuit> {
    const circuit = await this.circuits.findById(id);
    if (!circuit) throw new TrackNotFoundError(id);
    return circuit;
  }
}
