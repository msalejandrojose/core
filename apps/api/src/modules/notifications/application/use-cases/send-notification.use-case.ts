import { Inject, Injectable, Logger } from '@nestjs/common';
import type { NotificationChannel } from '@core/shared-types';
import { channelDefinition } from '../../domain/channels/channel-catalog';
import { validateFields } from '../../domain/channels/validate-fields';
import type { MessageType } from '../../domain/entities/message-type.entity';
import { ChannelNotSupportedError } from '../../domain/errors/channel-not-supported.error';
import { InvalidMessageContentError } from '../../domain/errors/invalid-message-content.error';
import { MessageTypeNotFoundError } from '../../domain/errors/message-type-not-found.error';
import { NotificationDeliveryError } from '../../domain/errors/notification-delivery.error';
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
    const rendered = renderContent(messageType.content, vars);

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

    // Valida el contenido YA renderizado (formato real, no plantillas).
    const fields = channelDefinition(channel).message;
    const error = validateFields(fields, rendered);
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

    try {
      await dispatcher.dispatch(
        { id: account.id, name: account.name, channel, config },
        { to: input.to, content: rendered },
      );
    } catch (err) {
      throw new NotificationDeliveryError(channel, err);
    }

    return { ...base, sent: true, skipped: false };
  }
}
