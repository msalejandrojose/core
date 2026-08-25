import { Inject, Injectable } from '@nestjs/common';
import { GrandPrix } from '../../domain/entities/grand-prix.entity';
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

export interface CreateGrandPrixInput {
  slug: string;
  name: string;
  isActive?: boolean;
  /** Ids de circuito en el orden en que se disputan — el orden es la posición en el array. */
  trackIds: string[];
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

    return this.grandPrixes.create({
      slug: input.slug,
      name: input.name,
      isActive: input.isActive ?? true,
      stages: input.trackIds.map((trackId, order) => ({ trackId, order })),
    });
  }
}
