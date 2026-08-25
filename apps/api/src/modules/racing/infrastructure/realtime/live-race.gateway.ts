import { Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import type { GhostSnapshot } from '../../domain/entities/ghost-snapshot';
import {
  CountdownEvent,
  LIVE_RACE_EVENTS,
  LiveRaceRoomManager,
  ParticipantDisconnectedEvent,
  RaceFinishedEvent,
  RaceStartedEvent,
  RoomUpdateEvent,
  SnapshotEvent,
} from '../../application/live-race/live-race-room.manager';
import {
  TRACK_REPOSITORY,
  type TrackRepositoryPort,
} from '../../application/ports/track-repository.port';

// Nombres de los eventos que manda el CLIENTE. Los que emite el servidor son
// los mismos nombres que `LIVE_RACE_EVENTS` (el gateway solo retransmite lo
// que ya emite el `LiveRaceRoomManager`, sin traducir nombres).
const CLIENT_EVENTS = {
  join: 'racing-live:join',
  leave: 'racing-live:leave',
  snapshot: 'racing-live:snapshot',
  finish: 'racing-live:finish',
} as const;

interface JoinPayload {
  trackSlug: string;
}
interface FinishPayload {
  durationMs: number;
}

// Gateway de carreras en vivo (TASK-323, tarea 2 de la fase online real).
// No decide nada por sí mismo: solo autentica la conexión (mismo JWT de la
// API, igual que `WhatsappGateway`) y traduce entre socket.io y el
// `LiveRaceRoomManager`, que es quien de verdad sabe en qué estado está
// cada sala. Broadcast SIN excluir al emisor en `snapshot`: es más simple
// que llevar un mapa userId→socket, y el cliente ya sabe qué userId es él
// mismo, así que ignora su propio eco.
@WebSocketGateway({
  namespace: '/racing-live',
  cors: { origin: true, credentials: true },
})
export class LiveRaceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() private readonly server!: Server;
  private readonly logger = new Logger('live-race.gateway');

  constructor(
    private readonly jwt: JwtService,
    private readonly rooms: LiveRaceRoomManager,
    @Inject(TRACK_REPOSITORY) private readonly tracks: TrackRepositoryPort,
  ) {
    this.rooms.on(LIVE_RACE_EVENTS.roomUpdate, (event: RoomUpdateEvent) => {
      this.server?.to(event.roomId).emit(LIVE_RACE_EVENTS.roomUpdate, event);
    });
    this.rooms.on(LIVE_RACE_EVENTS.countdown, (event: CountdownEvent) => {
      this.server?.to(event.roomId).emit(LIVE_RACE_EVENTS.countdown, event);
    });
    this.rooms.on(LIVE_RACE_EVENTS.raceStarted, (event: RaceStartedEvent) => {
      this.server?.to(event.roomId).emit(LIVE_RACE_EVENTS.raceStarted, event);
    });
    this.rooms.on(LIVE_RACE_EVENTS.snapshot, (event: SnapshotEvent) => {
      this.server?.to(event.roomId).emit(LIVE_RACE_EVENTS.snapshot, event);
    });
    this.rooms.on(LIVE_RACE_EVENTS.raceFinished, (event: RaceFinishedEvent) => {
      this.server?.to(event.roomId).emit(LIVE_RACE_EVENTS.raceFinished, event);
    });
    this.rooms.on(
      LIVE_RACE_EVENTS.participantDisconnected,
      (event: ParticipantDisconnectedEvent) => {
        this.server?.to(event.roomId).emit(LIVE_RACE_EVENTS.participantDisconnected, event);
      },
    );
  }

  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
      client.data.userId = payload.sub;
    } catch {
      this.logger.warn('Conexión WS rechazada: token inválido.');
      client.disconnect(true);
      return;
    }

    // Reconexión transparente: si el usuario tenía una sala en curso
    // esperando su vuelta (desconexión previa dentro del grace period), se
    // reengancha sin que el cliente tenga que pedirlo explícitamente.
    const roomId = this.rooms.reconnect(client.data.userId as string);
    if (roomId) await client.join(roomId);
  }

  handleDisconnect(client: Socket): void {
    const userId = client.data.userId as string | undefined;
    if (userId) this.rooms.handleDisconnect(userId);
  }

  @SubscribeMessage(CLIENT_EVENTS.join)
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinPayload,
  ): Promise<void> {
    const track = await this.tracks.findBySlug(payload?.trackSlug);
    if (!track) {
      client.emit('racing-live:error', { reason: 'circuito no encontrado' });
      return;
    }
    const userId = client.data.userId as string;
    const roomId = await this.rooms.join(track.id, userId, track.minPlausibleMs);
    await client.join(roomId);

    // El broadcast de `room-update` que dispara el propio `rooms.join()`
    // ocurre ANTES de este `client.join(roomId)` — el socket que se acaba
    // de unir todavía no pertenece a la sala de socket.io en ese instante,
    // así que se lo pierde. Reenvío directo al recién llegado, no un
    // broadcast: los demás ya estaban en la sala y sí lo recibieron bien.
    const snapshot = this.rooms.getRoomSnapshot(userId);
    if (snapshot) client.emit(LIVE_RACE_EVENTS.roomUpdate, snapshot);
  }

  @SubscribeMessage(CLIENT_EVENTS.leave)
  onLeave(@ConnectedSocket() client: Socket): void {
    this.rooms.leave(client.data.userId as string);
  }

  @SubscribeMessage(CLIENT_EVENTS.snapshot)
  onSnapshot(
    @ConnectedSocket() client: Socket,
    @MessageBody() snapshot: GhostSnapshot,
  ): void {
    this.rooms.relaySnapshot(client.data.userId as string, snapshot);
  }

  @SubscribeMessage(CLIENT_EVENTS.finish)
  onFinish(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: FinishPayload,
  ): void {
    this.rooms.recordFinish(client.data.userId as string, payload?.durationMs);
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken) return authToken;
    const header = client.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice('Bearer '.length);
    return null;
  }
}
