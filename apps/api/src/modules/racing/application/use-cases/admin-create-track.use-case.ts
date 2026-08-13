import { Inject, Injectable } from '@nestjs/common';
import { Track, TrackTheme } from '../../domain/entities/track.entity';
import { InvalidTrackPathError } from '../../domain/errors/invalid-track-path.error';
import { TrackSlugAlreadyExistsError } from '../../domain/errors/track-slug-already-exists.error';
import { TrackCell, validateTrackPath } from '../../domain/track-path';
import {
  TRACK_REPOSITORY,
  type TrackRepositoryPort,
} from '../ports/track-repository.port';

export interface CreateTrackInput {
  slug: string;
  name: string;
  sectorCount: number;
  minPlausibleMs: number;
  path: TrackCell[];
  theme: TrackTheme;
  grip: number;
  isActive?: boolean;
}

@Injectable()
export class AdminCreateTrackUseCase {
  constructor(
    @Inject(TRACK_REPOSITORY) private readonly tracks: TrackRepositoryPort,
  ) {}

  async execute(input: CreateTrackInput): Promise<Track> {
    // Reutiliza la validación de dominio: no duplicar las reglas del trazado
    // aquí (TASK-242, criterio de done).
    const validation = validateTrackPath(input.path);
    if (!validation.ok) {
      throw new InvalidTrackPathError(validation.reason, validation.details);
    }

    if (await this.tracks.existsSlug(input.slug)) {
      throw new TrackSlugAlreadyExistsError(input.slug);
    }

    return this.tracks.create({
      slug: input.slug,
      name: input.name,
      sectorCount: input.sectorCount,
      minPlausibleMs: input.minPlausibleMs,
      path: input.path,
      theme: input.theme,
      grip: input.grip,
      isActive: input.isActive ?? true,
    });
  }
}
