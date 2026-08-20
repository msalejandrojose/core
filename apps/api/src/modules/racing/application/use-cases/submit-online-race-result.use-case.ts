import { Inject, Injectable } from '@nestjs/common';
import { OnlineRace } from '../../domain/entities/online-race.entity';
import { InvalidOnlineRaceParticipantsError } from '../../domain/errors/invalid-online-race-participants.error';
import { TrackNotFoundError } from '../../domain/errors/track-not-found.error';
import {
  BEAT_FRIEND_COIN_REWARD,
  coinRewardForPosition,
  coinRewardForWinStreak,
} from '../../domain/racing-coin-rewards';
import {
  OnlineRaceParticipantCandidate,
  validateOnlineRaceParticipants,
} from '../../domain/validate-online-race-participants';
import { winStreakLength } from '../../domain/win-streak';
import {
  FRIENDSHIP_REPOSITORY,
  type FriendshipRepositoryPort,
} from '../ports/friendship-repository.port';
import {
  ONLINE_RACE_REPOSITORY,
  type OnlineRaceRepositoryPort,
} from '../ports/online-race-repository.port';
import {
  RACING_WALLET_REPOSITORY,
  type RacingWalletRepositoryPort,
} from '../ports/racing-wallet-repository.port';
import {
  TRACK_REPOSITORY,
  type TrackRepositoryPort,
} from '../ports/track-repository.port';

// Cuántas carreras recientes hace falta mirar para saber la racha de
// victorias (TASK-321): el bono deja de crecer a partir de la 4ª seguida,
// así que no hace falta mirar más atrás que eso.
const WIN_STREAK_LOOKBACK = 4;

export interface OnlineRaceRivalInput {
  role: 'TARGET' | 'THREAT';
  userId: string;
  durationMs: number;
}

export interface SubmitOnlineRaceResultInput {
  userId: string;
  trackSlug: string;
  durationMs: number;
  rivals: OnlineRaceRivalInput[];
}

// Registra el resultado de una carrera online ya jugada de principio a fin
// (TASK-283). NO decide contra quién se corre — eso lo hace el
// emparejamiento (TASK-284) o el propio cliente al elegir un amigo
// (TASK-223) — aquí solo se valida la lista de corredores que llega y se
// resuelve el podio una única vez.
//
// El propio resultado del jugador viaja aparte (`userId`/`durationMs`) y no
// dentro de la lista de corredores: el servidor ya sabe quién eres por el
// token, pedirle al cliente que declare su propio id sería una fuente de
// verdad redundante que además el juego no tenía por qué conocer.
@Injectable()
export class SubmitOnlineRaceResultUseCase {
  constructor(
    @Inject(TRACK_REPOSITORY) private readonly tracks: TrackRepositoryPort,
    @Inject(ONLINE_RACE_REPOSITORY)
    private readonly races: OnlineRaceRepositoryPort,
    @Inject(RACING_WALLET_REPOSITORY)
    private readonly wallets: RacingWalletRepositoryPort,
    @Inject(FRIENDSHIP_REPOSITORY)
    private readonly friendships: FriendshipRepositoryPort,
  ) {}

  async execute(input: SubmitOnlineRaceResultInput): Promise<OnlineRace> {
    const track = await this.tracks.findBySlug(input.trackSlug);
    if (!track) throw new TrackNotFoundError(input.trackSlug);

    const candidates: OnlineRaceParticipantCandidate[] = [
      { role: 'PLAYER', userId: input.userId, durationMs: input.durationMs },
      ...input.rivals,
    ];

    const validation = validateOnlineRaceParticipants(candidates, input.userId);
    if (!validation.ok) {
      throw new InvalidOnlineRaceParticipantsError(
        validation.reason,
        validation.details,
      );
    }

    const race = await this.races.create({
      userId: input.userId,
      trackId: track.id,
      participants: validation.participants.map((p) => ({
        role: p.role,
        userId: p.userId,
        durationMs: p.durationMs,
        position: p.position,
        deltaMs: p.deltaMs,
      })),
    });

    // Se acredita solo, sin acción manual (TASK-318/286) — el puesto ya
    // viene resuelto por `validateOnlineRaceParticipants`, no se recalcula
    // aquí. Solo el propio jugador cobra: los participantes TARGET/THREAT
    // son fantasmas de otro jugador, no corredores de verdad en esta tanda.
    const player = race.participants.find((p) => p.role === 'PLAYER');
    if (!player) return race;

    const reward = coinRewardForPosition(player.position);
    if (reward) {
      await this.wallets.credit({
        userId: input.userId,
        amount: reward.amount,
        source: reward.source,
        onlineRaceId: race.id,
      });
    }

    // Bono social (TASK-321): un flat único por carrera, aunque el jugador
    // haya vencido a más de un amigo entre TARGET/THREAT.
    const beatenRivals = race.participants.filter(
      (p) => p.role !== 'PLAYER' && p.position > player.position,
    );
    if (beatenRivals.length > 0) {
      const friends = await this.friendships.listFriends(input.userId);
      const friendIds = new Set(friends.map((f) => f.userId));
      const beatFriend = beatenRivals.some((r) => friendIds.has(r.userId));
      if (beatFriend) {
        await this.wallets.credit({
          userId: input.userId,
          amount: BEAT_FRIEND_COIN_REWARD.amount,
          source: BEAT_FRIEND_COIN_REWARD.source,
          onlineRaceId: race.id,
        });
      }
    }

    // Racha de victorias (TASK-321): solo tiene sentido comprobarla si esta
    // carrera se ganó — si no, la racha ya se ha cortado y sale 0 igualmente.
    if (player.position === 1) {
      const recentPositions = await this.races.recentPlayerPositions(
        input.userId,
        WIN_STREAK_LOOKBACK,
      );
      const streakReward = coinRewardForWinStreak(
        winStreakLength(recentPositions),
      );
      if (streakReward) {
        await this.wallets.credit({
          userId: input.userId,
          amount: streakReward.amount,
          source: streakReward.source,
          onlineRaceId: race.id,
        });
      }
    }

    return race;
  }
}
