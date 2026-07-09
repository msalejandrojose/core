import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  type OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type {
  MessageEvent,
  StatusEvent,
  WhatsappRealtimePort,
} from '../../application/ports/whatsapp-realtime.port';

// Nombres de los eventos emitidos al backoffice.
export const WHATSAPP_WS_EVENTS = {
  message: 'whatsapp:message',
  status: 'whatsapp:status',
} as const;

// Gateway de tiempo real de la bandeja de WhatsApp. Emite a los clientes del
// backoffice los mensajes nuevos y los cambios de estado. Autentica cada
// conexión con el mismo JWT de acceso de la API (pasado en `auth.token` o en la
// cabecera Authorization del handshake); si no es válido, cierra el socket.
//
// Implementa `WhatsappRealtimePort`: los use cases emiten a través de esta
// interfaz sin conocer socket.io.
@WebSocketGateway({
  namespace: '/whatsapp',
  cors: { origin: true, credentials: true },
})
export class WhatsappGateway
  implements WhatsappRealtimePort, OnGatewayConnection
{
  @WebSocketServer() private readonly server!: Server;
  private readonly logger = new Logger('whatsapp.gateway');

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      await this.jwt.verifyAsync(token);
    } catch {
      this.logger.warn('Conexión WS rechazada: token inválido.');
      client.disconnect(true);
    }
  }

  broadcastMessage(event: MessageEvent): void {
    this.server?.emit(WHATSAPP_WS_EVENTS.message, event);
  }

  broadcastStatus(event: StatusEvent): void {
    this.server?.emit(WHATSAPP_WS_EVENTS.status, event);
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken) return authToken;
    const header = client.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice('Bearer '.length);
    return null;
  }
}
