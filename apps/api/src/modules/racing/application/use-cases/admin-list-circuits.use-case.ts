import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { RacingCircuit } from '../../domain/entities/racing-circuit.entity';
import {
  AdminListCircuitsOptions,
  RACING_CIRCUIT_REPOSITORY,
  type RacingCircuitRepositoryPort,
} from '../ports/racing-circuit-repository.port';

@Injectable()
export class AdminListCircuitsUseCase {
  constructor(
    @Inject(RACING_CIRCUIT_REPOSITORY)
    private readonly circuits: RacingCircuitRepositoryPort,
  ) {}

  execute(opts: AdminListCircuitsOptions): Promise<PaginatedResult<RacingCircuit>> {
    return this.circuits.listAll(opts);
  }
}
