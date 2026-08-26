import { Inject, Injectable } from '@nestjs/common';
import {
  GrandPrix,
  GrandPrixDifficulty,
} from '../../domain/entities/grand-prix.entity';
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
import {
  resolveStages,
  type CreateGrandPrixStageInput,
} from './admin-create-grand-prix.use-case';

// El slug NO es editable, mismo motivo que `AdminUpdateTrackUseCase`. Cubre
// también activar/desactivar, vía `isActive` — mismo endpoint.
export interface UpdateGrandPrixInput {
  name?: string;
  isActive?: boolean;
  /** Si viene, sustituye la lista de circuitos entera, en el nuevo orden. */
  trackIds?: string[];
  /** Alternativa a `trackIds`, con vueltas por manga. */
  stages?: CreateGrandPrixStageInput[];
  difficulty?: GrandPrixDifficulty;
  creditsReward?: number;
  xpReward?: number;
  imageId?: string | null;
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

    // Solo si viene un cambio de mangas se validan de nuevo — actualizar
    // solo `name` o `imageId` no requiere que el circuito exista.
    const stagesChanged =
      input.trackIds !== undefined || input.stages !== undefined;
    const stages = stagesChanged ? resolveStages(input) : null;

    if (stages !== null) {
      const candidates = await Promise.all(
        stages.map(async (s) => ({
          trackId: s.trackId,
          track: await this.tracks.findById(s.trackId),
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
      difficulty: input.difficulty,
      creditsReward: input.creditsReward,
      xpReward: input.xpReward,
      imageId: input.imageId,
      stages:
        stages === null
          ? undefined
          : stages.map((s, order) => ({
              trackId: s.trackId,
              order,
              laps: s.laps,
            })),
    });
  }
}
