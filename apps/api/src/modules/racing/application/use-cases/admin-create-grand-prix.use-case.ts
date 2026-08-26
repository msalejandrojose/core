import { Inject, Injectable } from '@nestjs/common';
import {
  GrandPrix,
  GrandPrixDifficulty,
} from '../../domain/entities/grand-prix.entity';
import { GrandPrixSlugAlreadyExistsError } from '../../domain/errors/grand-prix-slug-already-exists.error';
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

export interface CreateGrandPrixStageInput {
  trackId: string;
  laps?: number;
}

export interface CreateGrandPrixInput {
  slug: string;
  name: string;
  isActive?: boolean;
  /** Ids de circuito en el orden en que se disputan — el orden es la posición en el array. */
  trackIds?: string[];
  /** Alternativa a `trackIds`: por manga, con sus propias vueltas. */
  stages?: CreateGrandPrixStageInput[];
  difficulty?: GrandPrixDifficulty;
  creditsReward?: number;
  xpReward?: number;
  imageId?: string | null;
}

@Injectable()
export class AdminCreateGrandPrixUseCase {
  constructor(
    @Inject(GRAND_PRIX_REPOSITORY)
    private readonly grandPrixes: GrandPrixRepositoryPort,
    @Inject(TRACK_REPOSITORY) private readonly tracks: TrackRepositoryPort,
  ) {}

  async execute(input: CreateGrandPrixInput): Promise<GrandPrix> {
    if (await this.grandPrixes.existsSlug(input.slug)) {
      throw new GrandPrixSlugAlreadyExistsError(input.slug);
    }

    const stages = resolveStages(input);

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

    return this.grandPrixes.create({
      slug: input.slug,
      name: input.name,
      isActive: input.isActive ?? true,
      difficulty: input.difficulty ?? 'MEDIUM',
      creditsReward: input.creditsReward ?? 0,
      xpReward: input.xpReward ?? 0,
      imageId: input.imageId ?? null,
      stages: stages.map((s, order) => ({
        trackId: s.trackId,
        order,
        laps: s.laps,
      })),
    });
  }
}

// Acepta `trackIds` (alternativa vieja) o `stages` (con vueltas). Si vienen
// los dos, gana `stages`.
export function resolveStages(input: {
  trackIds?: string[];
  stages?: CreateGrandPrixStageInput[];
}): { trackId: string; laps: number }[] {
  if (input.stages && input.stages.length > 0) {
    return input.stages.map((s) => ({
      trackId: s.trackId,
      laps: s.laps ?? 1,
    }));
  }
  return (input.trackIds ?? []).map((trackId) => ({ trackId, laps: 1 }));
}
