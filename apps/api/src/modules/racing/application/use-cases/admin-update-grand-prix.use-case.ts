import { Inject, Injectable } from '@nestjs/common';
import { GrandPrix } from '../../domain/entities/grand-prix.entity';
import { GrandPrixNotFoundError } from '../../domain/errors/grand-prix-not-found.error';
import { InvalidGrandPrixStagesError } from '../../domain/errors/invalid-grand-prix-stages.error';
import { validateGrandPrixStages } from '../../domain/validate-grand-prix-stages';
import {
  GRAND_PRIX_REPOSITORY,
  type GrandPrixRepositoryPort,
} from '../ports/grand-prix-repository.port';
import {
  TRACK_REPOSITORY,
  type TrackRepositoryPort,
} from '../ports/track-repository.port';

// El slug NO es editable, mismo motivo que `AdminUpdateTrackUseCase`. Cubre
// también activar/desactivar, vía `isActive` — mismo endpoint.
export interface UpdateGrandPrixInput {
  name?: string;
  isActive?: boolean;
  /** Si viene, sustituye la lista de circuitos entera, en el nuevo orden. */
  trackIds?: string[];
}

@Injectable()
export class AdminUpdateGrandPrixUseCase {
  constructor(
    @Inject(GRAND_PRIX_REPOSITORY)
    private readonly grandPrixes: GrandPrixRepositoryPort,
    @Inject(TRACK_REPOSITORY) private readonly tracks: TrackRepositoryPort,
  ) {}

  async execute(id: string, input: UpdateGrandPrixInput): Promise<GrandPrix> {
    const existing = await this.grandPrixes.findById(id);
    if (!existing) throw new GrandPrixNotFoundError(id);

    if (input.trackIds !== undefined) {
      const candidates = await Promise.all(
        input.trackIds.map(async (trackId) => ({
          trackId,
          track: await this.tracks.findById(trackId),
        })),
      );

      const validation = validateGrandPrixStages(candidates);
      if (!validation.ok) {
        throw new InvalidGrandPrixStagesError(
          validation.reason,
          validation.details,
        );
      }
    }

    return this.grandPrixes.update(id, {
      name: input.name,
      isActive: input.isActive,
      stages: input.trackIds?.map((trackId, order) => ({ trackId, order })),
    });
  }
}
