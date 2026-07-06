import { Inject, Injectable, Logger } from '@nestjs/common';
import type { NotificationChannel } from '@core/shared-types';
import { channelDefinition } from '../../domain/channels/channel-catalog';
import { validateMessageContent } from '../../domain/channels/validate-message-content';
import type { MessageType } from '../../domain/entities/message-type.entity';
import { ChannelNotSupportedError } from '../../domain/errors/channel-not-supported.error';
import { InvalidMessageContentError } from '../../domain/errors/invalid-message-content.error';
import { MessageTypeNotFoundError } from '../../domain/errors/message-type-not-found.error';
import { NotificationDeliveryError } from '../../domain/errors/notification-delivery.error';
import { compileEmailContent } from '../../domain/template/compile-email-content';
import { renderContent } from '../../domain/template/render-content';
import { decryptConfigSecrets } from '../config-secrets';
import {
  MESSAGE_TYPE_REPOSITORY,
  type MessageTypeRepositoryPort,
} from '../ports/message-type-repository.port';
import {
  CHANNEL_DISPATCHER_REGISTRY,
  type ChannelDispatcherRegistryPort,
} from '../ports/channel-dispatcher-registry.port';
import {
  NOTIFICATION_DELIVERY_REPOSITORY,
  type NotificationDeliveryRepositoryPort,
} from '../ports/notification-delivery-repository.port';
import {
  SECRET_CIPHER,
  type SecretCipherPort,
} from '../ports/secret-cipher.port';

export interface SendNotificationInput {
  to: string;
  variables?: Record<string, unknown>;
  dryRun?: boolean;
}

export interface SendNotificationResult {
  sent: boolean;
  dryRun: boolean;
  /** true cuando se omite por estar inactivo (mensaje/cuenta/tipo). */
  skipped: boolean;
  reason?: string;
  channel: NotificationChannel;
  to: string;
  messageTypeKey: string;
  /** Contenido renderizado (útil para el preview). */
  rendered: Record<string, unknown>;
  /** Id de la delivery persistida (solo en envíos reales). */
  deliveryId?: string;
}

@Injectable()
export class SendNotificationUseCase {
  private readonly logger = new Logger('notifications.send');

  constructor(
    @Inject(MESSAGE_TYPE_REPOSITORY)
    private readonly messageTypes: MessageTypeRepositoryPort,
    @Inject(CHANNEL_DISPATCHER_REGISTRY)
    private readonly dispatchers: ChannelDispatcherRegistryPort,
    @Inject(SECRET_CIPHER) private readonly cipher: SecretCipherPort,
    @Inject(NOTIFICATION_DELIVERY_REPOSITORY)
    private readonly deliveries: NotificationDeliveryRepositoryPort,
  ) {}

  async executeByKey(
    key: string,
    input: SendNotificationInput,
  ): Promise<SendNotificationResult> {
    const messageType = await this.messageTypes.findByKey(key);
    if (!messageType) throw new MessageTypeNotFoundError(key);
    return this.run(messageType, input);
  }

  async executeById(
    id: string,
    input: SendNotificationInput,
  ): Promise<SendNotificationResult> {
    const messageType = await this.messageTypes.findById(id);
    if (!messageType) throw new MessageTypeNotFoundError(id);
    return this.run(messageType, input);
  }

  private async run(
    messageType: MessageType,
    input: SendNotificationInput,
  ): Promise<SendNotificationResult> {
    const account = messageType.account;
    const type = account?.type;
    if (!account || !type) {
      // El repositorio siempre carga account+type; si falta, es un bug de datos.
      throw new MessageTypeNotFoundError(messageType.key);
    }
    const channel = type.channel;
    const dryRun = input.dryRun ?? false;

    // Renderiza el contenido contra `to` + variables (ya resueltas por el motor).
    const vars: Record<string, unknown> = {
      to: input.to,
      ...(input.variables ?? {}),
    };
    let rendered = renderContent(messageType.content, vars);
    // EMAIL: si hay `template` de bloques, se compila a html/text antes de
    // validar y despachar (retrocompatible: sin template, no cambia nada).
    if (channel === 'EMAIL') {
      rendered = compileEmailContent(rendered, vars);
    }

    const base = {
      dryRun,
      channel,
      to: input.to,
      messageTypeKey: messageType.key,
      rendered,
    };

    // Si algo de la cadena está inactivo, se omite (no es un error: en un
    // workflow queremos que el run continúe).
    if (!messageType.isActive || !account.isActive || !type.isActive) {
      this.logger.warn(
        `Omitido "${messageType.key}": mensaje/cuenta/tipo inactivo.`,
      );
      return { ...base, sent: false, skipped: true, reason: 'inactive' };
    }

    // Valida el contenido YA renderizado y compilado (formato real).
    const error = validateMessageContent(channel, rendered);
    if (error) throw new InvalidMessageContentError(error);

    const dispatcher = this.dispatchers.get(channel);
    if (!dispatcher) throw new ChannelNotSupportedError(channel);

    if (dryRun) {
      return { ...base, sent: false, skipped: false };
    }

    const config = decryptConfigSecrets(
      account.config,
      channelDefinition(channel).config,
      this.cipher,
    );

    // Registra la delivery (log de entregabilidad) antes de despachar: su id se
    // pasa al proveedor para que lo devuelva en los webhooks (correlación).
    const provider =
      typeof config.provider === 'string' ? config.provider : channel;
    const subject =
      typeof rendered.subject === 'string' ? rendered.subject : null;
    const delivery = await this.deliveries.create({
      messageTypeId: messageType.id,
      messageTypeKey: messageType.key,
      accountId: account.id,
      channel,
      provider,
      toAddress: input.to,
      subject,
      status: 'pending',
    });

    try {
      const result = await dispatcher.dispatch(
        { id: account.id, name: account.name, channel, config },
        { to: input.to, content: rendered },
        { deliveryId: delivery.id },
      );
      const now = new Date();
      await this.deliveries.update(delivery.id, {
        status: 'sent',
        providerMessageId: result.providerMessageId ?? null,
        sentAt: now,
        lastEventAt: now,
      });
    } catch (err) {
      await this.markFailed(delivery.id, err);
      throw new NotificationDeliveryError(channel, err);
    }

    return { ...base, sent: true, skipped: false, deliveryId: delivery.id };
  }

  // Marca la delivery como fallida sin enmascarar el error original del envío
  // (si la propia actualización falla, solo se registra).
  private async markFailed(deliveryId: string, err: unknown): Promise<void> {
    try {
      await this.deliveries.update(deliveryId, {
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
        lastEventAt: new Date(),
      });
    } catch (updateErr) {
      this.logger.error(
        `No se pudo marcar la delivery ${deliveryId} como fallida: ${
          updateErr instanceof Error ? updateErr.message : String(updateErr)
        }`,
      );
    }
  }
}
