import { Inject, Injectable } from '@nestjs/common';
import { GhostSnapshot } from '../../domain/entities/ghost-snapshot';
import { LapTime } from '../../domain/entities/lap-time.entity';
import { ImplausibleLapTimeError } from '../../domain/errors/implausible-lap-time.error';
import { TrackNotFoundError } from '../../domain/errors/track-not-found.error';
import { validateLap } from '../../domain/lap-validation';
import { personalBestCoinReward } from '../../domain/racing-coin-rewards';
import {
  LAP_TIME_REPOSITORY,
  type LapTimeRepositoryPort,
} from '../ports/lap-time-repository.port';
import {
  RACING_COIN_REWARD_CONFIG_REPOSITORY,
  type RacingCoinRewardConfigRepositoryPort,
} from '../ports/racing-coin-reward-config-repository.port';
import {
  RACING_WALLET_REPOSITORY,
  type RacingWalletRepositoryPort,
} from '../ports/racing-wallet-repository.port';
import {
  SEASON_REPOSITORY,
  type SeasonRepositoryPort,
} from '../ports/season-repository.port';
import {
  TRACK_REPOSITORY,
  type TrackRepositoryPort,
} from '../ports/track-repository.port';

export interface SubmitLapTimeInput {
  userId: string;
  trackSlug: string;
  durationMs: number;
  splitsMs: number[];
  clientVersion: string;
  /** El cliente solo lo manda cuando esta vuelta bate su marca local
   *  (TASK-220/221) — igualmente, aquí se descarta si no resulta ser la
   *  mejor marca del jugador en el servidor, para no guardar de más. */
  ghostSnapshots?: GhostSnapshot[];
}

export interface SubmitLapTimeResult {
  lapTime: LapTime;
  /** Si ha mejorado la marca propia del jugador en ese circuito. */
  personalBest: boolean;
  /** Posición en el leaderboard tras guardar el intento. */
  position: number | null;
}

@Injectable()
export class SubmitLapTimeUseCase {
  constructor(
    @Inject(TRACK_REPOSITORY) private readonly tracks: TrackRepositoryPort,
    @Inject(LAP_TIME_REPOSITORY) private readonly laps: LapTimeRepositoryPort,
    @Inject(SEASON_REPOSITORY) private readonly seasons: SeasonRepositoryPort,
    @Inject(RACING_WALLET_REPOSITORY)
    private readonly wallets: RacingWalletRepositoryPort,
    @Inject(RACING_COIN_REWARD_CONFIG_REPOSITORY)
    private readonly rewardConfigs: RacingCoinRewardConfigRepositoryPort,
  ) {}

  async execute(input: SubmitLapTimeInput): Promise<SubmitLapTimeResult> {
    const track = await this.tracks.findBySlug(input.trackSlug);
    if (track === null) throw new TrackNotFoundError(input.trackSlug);

    // La marca previa se lee ANTES de guardar: después ya no se puede saber si
    // este intento la mejoró, porque él mismo pasaría a ser la mejor. Sin
    // temporada configurada, `currentSeason` es null y el intento se guarda
    // igual, solo que fuera de cualquier clasificación acotada (TASK-227).
    const [previousBest, previousAttemptAt, currentSeason] = await Promise.all([
      this.laps.findPersonalBest(input.userId, track.id),
      this.laps.findLastAttemptAt(input.userId),
      this.seasons.findCurrent(),
    ]);

    const validation = validateLap(
      {
        durationMs: input.durationMs,
        splitsMs: input.splitsMs,
        clientVersion: input.clientVersion,
      },
      { track, previousAttemptAt, now: new Date() },
    );

    if (!validation.ok) {
      throw new ImplausibleLapTimeError(validation.reason, {
        ...validation.details,
        trackSlug: track.slug,
      });
    }

    const isPersonalBest =
      previousBest === null || input.durationMs < previousBest.durationMs;

    const lapTime = await this.laps.create({
      userId: input.userId,
      trackId: track.id,
      durationMs: input.durationMs,
      splitsMs: input.splitsMs,
      clientVersion: input.clientVersion,
      ghostSnapshots: isPersonalBest ? input.ghostSnapshots : undefined,
      seasonId: currentSeason?.id ?? null,
    });

    // Solo cuenta como bono si había algo que batir (TASK-321) — la primera
    // vez que un jugador sube tiempo en un circuito `previousBest` es null y
    // `isPersonalBest` sale true igualmente (para guardar el fantasma), pero
    // ahí no ha batido nada todavía.
    if (previousBest !== null && isPersonalBest) {
      const amounts = await this.rewardConfigs.getAmounts();
      const reward = personalBestCoinReward(amounts);
      if (reward) {
        await this.wallets.credit({
          userId: input.userId,
          amount: reward.amount,
          source: reward.source,
          lapTimeId: lapTime.id,
        });
      }
    }

    return {
      lapTime,
      personalBest: isPersonalBest,
      position: await this.laps.positionOf(track.id, input.userId),
    };
  }
}
