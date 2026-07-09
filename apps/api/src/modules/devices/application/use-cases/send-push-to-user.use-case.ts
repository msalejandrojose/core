import { Inject, Injectable, Logger } from '@nestjs/common';
import { SendNotificationUseCase } from '../../../notifications/application/use-cases/send-notification.use-case';
import {
  DEVICE_REPOSITORY,
  type DeviceRepositoryPort,
} from '../ports/device-repository.port';

export interface SendPushToUserInput {
  userId: string;
  /** Key del `MessageType` de canal PUSH a renderizar/enviar. */
  messageTypeKey: string;
  variables?: Record<string, unknown>;
  dryRun?: boolean;
}

export interface SendPushToUserResult {
  /** Nº de dispositivos (tokens) resueltos para el usuario. */
  devices: number;
  /** Nº de envíos realizados con éxito. */
  sent: number;
  /** Nº de envíos omitidos (mensaje/cuenta/tipo inactivo). */
  skipped: number;
}

// Resuelve los tokens de dispositivo de un usuario y envía el push a cada uno
// reutilizando `SendNotificationUseCase` (que ya sabe renderizar, validar y
// despachar por FCM). Este es el eslabón que faltaba: el resto del sistema
// enviaba push a un token suelto; aquí "enviar push a un usuario" se traduce a
// "enviar a todos sus dispositivos".
//
// Los fallos de un token concreto (p.ej. `NotRegistered`) no abortan el resto:
// se registran y se sigue con los demás dispositivos.
@Injectable()
export class SendPushToUserUseCase {
  private readonly logger = new Logger('devices.send-push');

  constructor(
    @Inject(DEVICE_REPOSITORY)
    private readonly devices: DeviceRepositoryPort,
    private readonly sendNotification: SendNotificationUseCase,
  ) {}

  async execute(input: SendPushToUserInput): Promise<SendPushToUserResult> {
    const tokens = await this.devices.listTokensByUser(input.userId);
    const result: SendPushToUserResult = {
      devices: tokens.length,
      sent: 0,
      skipped: 0,
    };

    for (const token of tokens) {
      try {
        const r = await this.sendNotification.executeByKey(
          input.messageTypeKey,
          { to: token, variables: input.variables, dryRun: input.dryRun },
        );
        if (r.sent) result.sent += 1;
        if (r.skipped) result.skipped += 1;
      } catch (err) {
        this.logger.warn(
          `Push a token del usuario ${input.userId} falló: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    return result;
  }
}
