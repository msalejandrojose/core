import { EventEmitter } from 'node:events';
import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { computeRatingChanges, RatingChange } from '../../domain/compute-rating-changes';
import { GhostSnapshot } from '../../domain/entities/ghost-snapshot';
import { LiveRaceParticipant, LiveRaceStatus } from '../../domain/entities/live-race.entity';
import { matchmakingRatingWindow } from '../../domain/matchmaking-rating-window';
import { coinRewardForPosition } from '../../domain/racing-coin-rewards';
import { resolveLiveRaceResult } from '../../domain/resolve-live-race-result';
import {
  LIVE_RACE_REPOSITORY,
  type LiveRaceRepositoryPort,
} from '../ports/live-race-repository.port';
import {
  PLAYER_RATING_REPOSITORY,
  type PlayerRatingRepositoryPort,
} from '../ports/player-rating-repository.port';
import {
  RACING_COIN_REWARD_CONFIG_REPOSITORY,
  type RacingCoinRewardConfigRepositoryPort,
} from '../ports/racing-coin-reward-config-repository.port';
import {
  RACING_WALLET_REPOSITORY,
  type RacingWalletRepositoryPort,
} from '../ports/racing-wallet-repository.port';

// Ajustes de la sala (TASK-323, tarea 2 del desglose de la fase online real).
// De momento son constantes — el backoffice los hará editables cuando
// llegue esa tarea, sin tocar esta pieza más que la fuente del valor.
export const MIN_PLAYERS_TO_START = 2;
export const MAX_PLAYERS_PER_ROOM = 4;
/** Cuánto se espera a que se una más gente una vez hay quórum mínimo, antes
 *  de arrancar igualmente con los que haya. */
export const FILL_TIMEOUT_MS = 15_000;
export const COUNTDOWN_MS = 3_000;
/** Cuánto se espera a que alguien reconecte antes de darlo por DNF. */
export const RECONNECT_GRACE_MS = 10_000;
/** Red de seguridad: si la carrera nunca se cierra sola (nadie termina ni
 *  se desconecta), se fuerza el cierre para no dejar la sala viva para siempre. */
export const RACE_TIMEOUT_MS = 10 * 60 * 1000;

export type RoomStatus = 'WAITING_PLAYERS' | 'COUNTDOWN' | 'RACING';

export const LIVE_RACE_EVENTS = {
  roomUpdate: 'room-update',
  countdown: 'countdown',
  raceStarted: 'race-started',
  snapshot: 'snapshot',
  raceFinished: 'race-finished',
  participantDisconnected: 'participant-disconnected',
} as const;

export interface RoomUpdateEvent {
  roomId: string;
  status: RoomStatus;
  playerIds: string[];
}
export interface CountdownEvent {
  roomId: string;
  ms: number;
}
export interface RaceStartedEvent {
  roomId: string;
  startAt: number;
}
export interface SnapshotEvent {
  roomId: string;
  fromUserId: string;
  snapshot: GhostSnapshot;
}
export interface RaceFinishedEvent {
  roomId: string;
  raceId: string;
  result: LiveRaceParticipant[];
  // Vacío si no hubo al menos dos corredores reales que terminaran (con uno
  // solo, o todos DNF, no hay contra quién medirse — ver `computeRatingChanges`).
  ratingChanges: RatingChange[];
}
export interface ParticipantDisconnectedEvent {
  roomId: string;
  userId: string;
}

interface RoomParticipant {
  userId: string;
  rating: number;
  connected: boolean;
  durationMs: number | null;
  disconnectTimer: NodeJS.Timeout | null;
}

interface Room {
  id: string;
  trackId: string;
  status: RoomStatus;
  createdAt: number;
  participants: Map<string, RoomParticipant>;
  fillTimer: NodeJS.Timeout | null;
  countdownTimer: NodeJS.Timeout | null;
  raceTimeoutTimer: NodeJS.Timeout | null;
}

// Ciclo de vida completo de una sala de carrera en vivo (TASK-323): une
// jugadores por circuito, arranca la cuenta atrás, retransmite snapshots
// mientras corre y resuelve el resultado al final. Vive enteramente en
// memoria — sin Redis todavía (ver decisión 1 del diseño técnico: se
// revisita si hace falta escalar a más de una instancia) — así que solo
// funciona correctamente con un único proceso de API.
//
// No sabe nada de socket.io: emite eventos de dominio (`LIVE_RACE_EVENTS`)
// con el `roomId` ya dentro de cada payload, y es el gateway quien traduce
// eso a un broadcast de la sala de socket.io correspondiente. Así esta
// pieza se puede testear con jest.useFakeTimers() sin levantar un socket.
@Injectable()
export class LiveRaceRoomManager extends EventEmitter {
  private readonly rooms = new Map<string, Room>();
  private readonly roomIdByUserId = new Map<string, string>();

  constructor(
    @Inject(LIVE_RACE_REPOSITORY)
    private readonly races: LiveRaceRepositoryPort,
    @Inject(RACING_WALLET_REPOSITORY)
    private readonly wallets: RacingWalletRepositoryPort,
    @Inject(RACING_COIN_REWARD_CONFIG_REPOSITORY)
    private readonly rewardConfigs: RacingCoinRewardConfigRepositoryPort,
    @Inject(PLAYER_RATING_REPOSITORY)
    private readonly ratings: PlayerRatingRepositoryPort,
  ) {
    super();
  }

  /** Busca sitio en una sala compatible en rating (TASK-323, tarea 4), o
   *  abre una nueva si ninguna lo es. Idempotente: si el jugador ya está en
   *  una sala, devuelve esa misma sin duplicar la entrada (reconexión
   *  rápida antes de que expire nada, o doble clic en el cliente). */
  async join(trackId: string, userId: string): Promise<string> {
    const existingRoomId = this.roomIdByUserId.get(userId);
    if (existingRoomId && this.rooms.has(existingRoomId)) return existingRoomId;

    const rating = await this.ratings.getRating(userId);
    const room = this.findCompatibleWaitingRoom(trackId, rating) ?? this.createRoom(trackId);
    room.participants.set(userId, {
      userId,
      rating,
      connected: true,
      durationMs: null,
      disconnectTimer: null,
    });
    this.roomIdByUserId.set(userId, room.id);
    this.emitRoomUpdate(room);

    if (room.participants.size >= MAX_PLAYERS_PER_ROOM) {
      this.startCountdown(room);
    } else if (room.participants.size >= MIN_PLAYERS_TO_START && !room.fillTimer) {
      room.fillTimer = setTimeout(() => {
        room.fillTimer = null;
        this.startCountdown(room);
      }, FILL_TIMEOUT_MS);
    }

    return room.id;
  }

  /** Cancela la búsqueda antes de que empiece la carrera. Si ya está
   *  corriendo, es indistinguible de una desconexión real. */
  leave(userId: string): void {
    const room = this.roomOf(userId);
    if (!room) return;
    if (room.status === 'RACING') {
      this.handleDisconnect(userId);
      return;
    }
    this.cancelCountdownIfAny(room);
    this.removeFromWaitingRoom(room, userId);
  }

  relaySnapshot(userId: string, snapshot: GhostSnapshot): void {
    const room = this.roomOf(userId);
    if (!room || room.status !== 'RACING') return;
    if (!room.participants.get(userId)?.connected) return;
    this.emit(LIVE_RACE_EVENTS.snapshot, {
      roomId: room.id,
      fromUserId: userId,
      snapshot,
    } satisfies SnapshotEvent);
  }

  recordFinish(userId: string, durationMs: number): void {
    if (!Number.isInteger(durationMs) || durationMs <= 0) return;
    const room = this.roomOf(userId);
    if (!room || room.status !== 'RACING') return;
    const participant = room.participants.get(userId);
    if (!participant || participant.durationMs !== null) return;
    participant.durationMs = durationMs;
    this.finalizeIfEveryoneIsResolved(room);
  }

  handleDisconnect(userId: string): void {
    const room = this.roomOf(userId);
    if (!room) {
      this.roomIdByUserId.delete(userId);
      return;
    }
    if (room.status !== 'RACING') {
      this.cancelCountdownIfAny(room);
      this.removeFromWaitingRoom(room, userId);
      return;
    }
    const participant = room.participants.get(userId);
    if (!participant || !participant.connected) return;
    participant.connected = false;
    this.emit(LIVE_RACE_EVENTS.participantDisconnected, {
      roomId: room.id,
      userId,
    } satisfies ParticipantDisconnectedEvent);
    participant.disconnectTimer = setTimeout(() => {
      participant.disconnectTimer = null;
      this.finalizeIfEveryoneIsResolved(room);
    }, RECONNECT_GRACE_MS);
  }

  /** Reengancha una reconexión dentro del grace period. Devuelve el id de
   *  sala para que el gateway vuelva a unir el socket, o null si ya no hay
   *  nada a lo que reconectarse (la sala cerró mientras tanto). */
  reconnect(userId: string): string | null {
    const room = this.roomOf(userId);
    if (!room) return null;
    const participant = room.participants.get(userId);
    if (!participant) return null;
    if (participant.connected) return room.id;
    if (room.status !== 'RACING' && room.status !== 'COUNTDOWN') return null;
    participant.connected = true;
    if (participant.disconnectTimer) {
      clearTimeout(participant.disconnectTimer);
      participant.disconnectTimer = null;
    }
    return room.id;
  }

  /** Estado actual de la sala de este jugador, para cuando el gateway
   *  necesita reenviárselo directamente (ver comentario en `LiveRaceGateway
   *  .onJoin` sobre por qué el broadcast normal no le llega a quien se
   *  acaba de unir). Null si no está en ninguna sala. */
  getRoomSnapshot(userId: string): RoomUpdateEvent | null {
    const room = this.roomOf(userId);
    if (!room) return null;
    return {
      roomId: room.id,
      status: room.status,
      playerIds: [...room.participants.keys()],
    };
  }

  // De entre las salas abiertas de ese circuito, la más cercana en rating
  // cuyo hueco actual (ventana según cuánto lleva esperando, ver
  // `matchmakingRatingWindow`) admita a este candidato — no la primera que
  // encaje, la MEJOR que encaje.
  private findCompatibleWaitingRoom(trackId: string, rating: number): Room | undefined {
    const now = Date.now();
    let best: Room | undefined;
    let bestDiff = Infinity;
    for (const room of this.rooms.values()) {
      if (
        room.trackId !== trackId ||
        room.status !== 'WAITING_PLAYERS' ||
        room.participants.size >= MAX_PLAYERS_PER_ROOM
      ) {
        continue;
      }
      const ratings = [...room.participants.values()].map((p) => p.rating);
      const averageRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
      const window = matchmakingRatingWindow(now - room.createdAt);
      const diff = Math.abs(rating - averageRating);
      if (diff <= window && diff < bestDiff) {
        best = room;
        bestDiff = diff;
      }
    }
    return best;
  }

  private createRoom(trackId: string): Room {
    const room: Room = {
      id: randomUUID(),
      trackId,
      status: 'WAITING_PLAYERS',
      createdAt: Date.now(),
      participants: new Map(),
      fillTimer: null,
      countdownTimer: null,
      raceTimeoutTimer: null,
    };
    this.rooms.set(room.id, room);
    return room;
  }

  private roomOf(userId: string): Room | undefined {
    const roomId = this.roomIdByUserId.get(userId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  private cancelCountdownIfAny(room: Room): void {
    if (room.status !== 'COUNTDOWN' || !room.countdownTimer) return;
    clearTimeout(room.countdownTimer);
    room.countdownTimer = null;
    room.status = 'WAITING_PLAYERS';
  }

  private removeFromWaitingRoom(room: Room, userId: string): void {
    room.participants.delete(userId);
    this.roomIdByUserId.delete(userId);
    if (room.participants.size === 0) {
      if (room.fillTimer) clearTimeout(room.fillTimer);
      this.rooms.delete(room.id);
      return;
    }
    if (room.participants.size < MIN_PLAYERS_TO_START && room.fillTimer) {
      clearTimeout(room.fillTimer);
      room.fillTimer = null;
    }
    this.emitRoomUpdate(room);
  }

  private startCountdown(room: Room): void {
    if (room.status !== 'WAITING_PLAYERS') return;
    if (room.fillTimer) {
      clearTimeout(room.fillTimer);
      room.fillTimer = null;
    }
    room.status = 'COUNTDOWN';
    this.emit(LIVE_RACE_EVENTS.countdown, {
      roomId: room.id,
      ms: COUNTDOWN_MS,
    } satisfies CountdownEvent);
    room.countdownTimer = setTimeout(() => {
      room.countdownTimer = null;
      this.startRace(room);
    }, COUNTDOWN_MS);
  }

  private startRace(room: Room): void {
    room.status = 'RACING';
    this.emit(LIVE_RACE_EVENTS.raceStarted, {
      roomId: room.id,
      startAt: Date.now(),
    } satisfies RaceStartedEvent);
    room.raceTimeoutTimer = setTimeout(() => {
      room.raceTimeoutTimer = null;
      void this.finalize(room);
    }, RACE_TIMEOUT_MS);
  }

  private finalizeIfEveryoneIsResolved(room: Room): void {
    const allResolved = [...room.participants.values()].every(
      (p) => p.durationMs !== null || !p.connected,
    );
    if (allResolved) void this.finalize(room);
  }

  private async finalize(room: Room): Promise<void> {
    // Se limpia TODO de forma síncrona antes del primer `await`: ninguna
    // llamada posterior (recordFinish, handleDisconnect...) encuentra ya
    // esta sala, así que no hay forma de que `finalize` se dispare dos veces
    // para la misma sala aunque coincidan un timeout y un último `finish`.
    if (room.fillTimer) clearTimeout(room.fillTimer);
    if (room.countdownTimer) clearTimeout(room.countdownTimer);
    if (room.raceTimeoutTimer) clearTimeout(room.raceTimeoutTimer);
    for (const p of room.participants.values()) {
      if (p.disconnectTimer) clearTimeout(p.disconnectTimer);
    }
    this.rooms.delete(room.id);
    for (const userId of room.participants.keys()) {
      this.roomIdByUserId.delete(userId);
    }

    const finishers = [...room.participants.values()]
      .filter((p): p is RoomParticipant & { durationMs: number } => p.durationMs !== null)
      .map((p) => ({ userId: p.userId, durationMs: p.durationMs }));
    const dnfUserIds = [...room.participants.values()]
      .filter((p) => p.durationMs === null)
      .map((p) => p.userId);

    const result = resolveLiveRaceResult(finishers, dnfUserIds);
    const status: LiveRaceStatus = finishers.length > 0 ? 'FINISHED' : 'ABANDONED';

    const race = await this.races.create({
      trackId: room.trackId,
      status,
      finishedAt: new Date(),
      participants: result,
    });

    // Cada corredor real cobra por SU puesto — a diferencia del modo
    // asíncrono, aquí todos son cuentas de verdad, no fantasmas de un rival.
    if (finishers.length > 0) {
      const amounts = await this.rewardConfigs.getAmounts();
      for (const participant of result) {
        if (participant.disconnected || participant.position === null) continue;
        const reward = coinRewardForPosition(participant.position, amounts);
        if (!reward) continue;
        await this.wallets.credit({
          userId: participant.userId,
          amount: reward.amount,
          source: reward.source,
          liveRaceId: race.id,
        });
      }
    }

    // Rating (TASK-323, tarea 3): solo entre quienes SÍ terminaron — un DNF
    // ni sube ni baja el nivel de nadie (ver `computeRatingChanges`). Con
    // un único finisher no hay con quién compararse, así que no hace falta
    // ni pedir su rating actual.
    const ratingChanges =
      finishers.length > 1 ? await this.applyRatingChanges(result) : [];

    this.emit(LIVE_RACE_EVENTS.raceFinished, {
      roomId: room.id,
      raceId: race.id,
      result,
      ratingChanges,
    } satisfies RaceFinishedEvent);
  }

  private async applyRatingChanges(
    result: LiveRaceParticipant[],
  ): Promise<RatingChange[]> {
    const finishedUserIds = result
      .filter((p) => !p.disconnected)
      .map((p) => p.userId);
    const currentRatings = await this.ratings.getRatings(finishedUserIds);

    const changes = computeRatingChanges(
      result
        .filter((p) => !p.disconnected && p.position !== null)
        .map((p) => ({
          userId: p.userId,
          position: p.position as number,
          rating: currentRatings.get(p.userId) as number,
        })),
    );

    await this.ratings.applyChanges(
      changes.map((c) => ({ userId: c.userId, rating: c.ratingAfter })),
    );
    return changes;
  }

  private emitRoomUpdate(room: Room): void {
    this.emit(LIVE_RACE_EVENTS.roomUpdate, {
      roomId: room.id,
      status: room.status,
      playerIds: [...room.participants.keys()],
    } satisfies RoomUpdateEvent);
  }
}
