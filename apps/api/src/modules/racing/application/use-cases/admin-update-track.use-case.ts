import { Inject, Injectable } from '@nestjs/common';
import { Track, TrackTheme } from '../../domain/entities/track.entity';
import { InvalidTrackPathError } from '../../domain/errors/invalid-track-path.error';
import { TrackNotFoundError } from '../../domain/errors/track-not-found.error';
import { TrackCell, validateTrackPath } from '../../domain/track-path';
import {
  TRACK_REPOSITORY,
  type TrackRepositoryPort,
} from '../ports/track-repository.port';

// El slug NO es editable: el cliente lo referencia desde su propio catálogo
// (o, para un circuito nacido en el servidor, queda fijado al crearlo).
// Cubre también activar/desactivar el circuito, vía `isActive` — mismo
// endpoint, no uno aparte (TASK-242, criterio de done).
export interface UpdateTrackInput {
  name?: string;
  sectorCount?: number;
  minPlausibleMs?: number;
  path?: TrackCell[];
  theme?: TrackTheme;
  grip?: number;
  isActive?: boolean;
}

@Injectable()
export class AdminUpdateTrackUseCase {
  constructor(
    @Inject(TRACK_REPOSITORY) private readonly tracks: TrackRepositoryPort,
  ) {}

  async execute(id: string, input: UpdateTrackInput): Promise<Track> {
    const existing = await this.tracks.findById(id);
    if (!existing) throw new TrackNotFoundError(id);

    if (input.path !== undefined) {
      const validation = validateTrackPath(input.path);
      if (!validation.ok) {
        throw new InvalidTrackPathError(validation.reason, validation.details);
      }
    }

    return this.tracks.update(id, {
      name: input.name,
      sectorCount: input.sectorCount,
      minPlausibleMs: input.minPlausibleMs,
      path: input.path,
      theme: input.theme,
      grip: input.grip,
      isActive: input.isActive,
    });
  }
}
