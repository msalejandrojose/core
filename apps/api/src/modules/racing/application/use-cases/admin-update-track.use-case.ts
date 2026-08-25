import { Inject, Injectable } from '@nestjs/common';
import { Track } from '../../domain/entities/track.entity';
import { TrackNotFoundError } from '../../domain/errors/track-not-found.error';
import {
  TRACK_REPOSITORY,
  type TrackRepositoryPort,
} from '../ports/track-repository.port';

// El slug NO es editable: el cliente lo referencia desde su propio catálogo.
// La geometría (trazado/tema/agarre/imagen) tampoco se edita aquí desde
// TASK-336: vive en `RacingCircuit`, se edita vía `AdminUpdateCircuitUseCase`.
// Cubre activar/desactivar ESTA variante concreta, vía `isActive` — mismo
// endpoint, no uno aparte (TASK-242, criterio de done).
export interface UpdateTrackInput {
  name?: string;
  sectorCount?: number;
  minPlausibleMs?: number;
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

    return this.tracks.update(id, {
      name: input.name,
      sectorCount: input.sectorCount,
      minPlausibleMs: input.minPlausibleMs,
      isActive: input.isActive,
    });
  }
}
