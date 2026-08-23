import { Inject, Injectable } from '@nestjs/common';
import { RacingCircuit } from '../../domain/entities/racing-circuit.entity';
import { TrackTheme } from '../../domain/entities/track.entity';
import { InvalidTrackPathError } from '../../domain/errors/invalid-track-path.error';
import { TrackNotFoundError } from '../../domain/errors/track-not-found.error';
import { TrackCell, validateTrackPath } from '../../domain/track-path';
import {
  RACING_CIRCUIT_REPOSITORY,
  type RacingCircuitRepositoryPort,
} from '../ports/racing-circuit-repository.port';

// El slug NO es editable (mismo criterio que `AdminUpdateTrackUseCase`).
// Cubre también activar/desactivar el circuito entero, vía `isActive` —
// independiente de `isInRotation`, que solo lo escribe el rotador diario.
export interface UpdateCircuitInput {
  name?: string;
  checkpoints?: number;
  path?: TrackCell[];
  theme?: TrackTheme;
  grip?: number;
  isActive?: boolean;
  /** `null` limpia la imagen; `undefined` la deja tal cual. */
  imageId?: string | null;
}

@Injectable()
export class AdminUpdateCircuitUseCase {
  constructor(
    @Inject(RACING_CIRCUIT_REPOSITORY)
    private readonly circuits: RacingCircuitRepositoryPort,
  ) {}

  async execute(id: string, input: UpdateCircuitInput): Promise<RacingCircuit> {
    const existing = await this.circuits.findById(id);
    if (!existing) throw new TrackNotFoundError(id);

    if (input.path !== undefined) {
      const validation = validateTrackPath(input.path);
      if (!validation.ok) {
        throw new InvalidTrackPathError(validation.reason, validation.details);
      }
    }

    return this.circuits.update(id, {
      name: input.name,
      checkpoints: input.checkpoints,
      path: input.path,
      theme: input.theme,
      grip: input.grip,
      isActive: input.isActive,
      imageId: input.imageId,
    });
  }
}
