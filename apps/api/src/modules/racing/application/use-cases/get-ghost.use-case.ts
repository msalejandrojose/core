import { Inject, Injectable } from '@nestjs/common';
import { GhostSnapshot } from '../../domain/entities/ghost-snapshot';
import { TrackNotFoundError } from '../../domain/errors/track-not-found.error';
import {
  LAP_TIME_REPOSITORY,
  type LapTimeRepositoryPort,
} from '../ports/lap-time-repository.port';
import {
  TRACK_REPOSITORY,
  type TrackRepositoryPort,
} from '../ports/track-repository.port';

export interface GhostResult {
  durationMs: number;
  snapshots: GhostSnapshot[];
}

// El fantasma de OTRO jugador (TASK-221): "no hay fantasma" es un estado
// normal, no un error — un jugador puede no tener marca en ese circuito, o
// tenerla de antes de que existiera esta funcionalidad. Por eso devuelve
// null en vez de lanzar, a diferencia de `GetTrackUseCase` con un slug que
// no existe.
@Injectable()
export class GetGhostUseCase {
  constructor(
    @Inject(TRACK_REPOSITORY) private readonly tracks: TrackRepositoryPort,
    @Inject(LAP_TIME_REPOSITORY) private readonly laps: LapTimeRepositoryPort,
  ) {}

  async execute(
    trackSlug: string,
    userId: string,
  ): Promise<GhostResult | null> {
    const track = await this.tracks.findBySlug(trackSlug);
    if (!track) throw new TrackNotFoundError(trackSlug);

    const best = await this.laps.findPersonalBest(userId, track.id);
    if (!best || !best.ghostSnapshots) return null;

    return { durationMs: best.durationMs, snapshots: best.ghostSnapshots };
  }
}
