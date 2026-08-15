import { Inject, Injectable } from '@nestjs/common';
import { TrackNotFoundError } from '../../domain/errors/track-not-found.error';
import {
  OnlineRaceRivalCandidate,
  resolveOnlineRaceRivals,
} from '../../domain/resolve-online-race-rivals';
import {
  LAP_TIME_REPOSITORY,
  type LapTimeRepositoryPort,
} from '../ports/lap-time-repository.port';
import {
  TRACK_REPOSITORY,
  type TrackRepositoryPort,
} from '../ports/track-repository.port';

export interface OnlineRaceMatch {
  trackId: string;
  target: OnlineRaceRivalCandidate | null;
  threat: OnlineRaceRivalCandidate | null;
}

// Arma una carrera online para jugar (TASK-284): aplica el algoritmo de
// emparejamiento (TASK-282) sobre el estado ACTUAL del leaderboard. No
// persiste nada — la carrera solo se registra al final, al subir su
// resultado (TASK-283). Se puede llamar tantas veces como se quiera sin
// efecto secundario, y el par de rivales puede cambiar entre llamadas si la
// clasificación se mueve mientras tanto (decisión: se recalcula en cada
// carrera, no se fija).
@Injectable()
export class MatchOnlineRaceUseCase {
  constructor(
    @Inject(TRACK_REPOSITORY) private readonly tracks: TrackRepositoryPort,
    @Inject(LAP_TIME_REPOSITORY) private readonly laps: LapTimeRepositoryPort,
  ) {}

  async execute(userId: string, trackSlug: string): Promise<OnlineRaceMatch> {
    const track = await this.tracks.findBySlug(trackSlug);
    if (!track) throw new TrackNotFoundError(trackSlug);

    // Sin marca propia en el circuito no hay dónde anclar "el vecino
    // inmediato": el jugador corre esta primera vez en solitario, y a
    // partir de la siguiente ya se le puede emparejar.
    const playerBest = await this.laps.findPersonalBest(userId, track.id);
    if (!playerBest) {
      return { trackId: track.id, target: null, threat: null };
    }

    const candidates = await this.laps.findGhostRivalCandidates(
      track.id,
      userId,
      playerBest.durationMs,
    );

    const rivals = resolveOnlineRaceRivals({
      player: {
        userId,
        durationMs: playerBest.durationMs,
        snapshots: playerBest.ghostSnapshots,
      },
      targetCandidate: candidates.target
        ? {
            userId: candidates.target.userId,
            durationMs: candidates.target.durationMs,
            snapshots: candidates.target.ghostSnapshots,
          }
        : null,
      threatCandidate: candidates.threat
        ? {
            userId: candidates.threat.userId,
            durationMs: candidates.threat.durationMs,
            snapshots: candidates.threat.ghostSnapshots,
          }
        : null,
    });

    return { trackId: track.id, target: rivals.target, threat: rivals.threat };
  }
}
