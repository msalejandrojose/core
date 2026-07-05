import { Injectable, Logger } from '@nestjs/common';
import type { NotificationChannel } from '@core/shared-types';
import type {
  ChannelDispatcherPort,
  DispatchAccount,
  RenderedMessage,
} from '../../application/ports/channel-dispatcher.port';
import { ChannelDispatcher } from '../../application/ports/channel-dispatcher.decorator';
import { contentField } from './content-field';

// Stub del canal SMS: registra el intento pero no envía. Deja el canal
// disponible en el registry para probar el flujo end-to-end. La implementación
// real (Twilio) es una iteración futura; sustituir el cuerpo de `dispatch`.
@Injectable()
@ChannelDispatcher()
export class SmsChannelDispatcher implements ChannelDispatcherPort {
  readonly channel: NotificationChannel = 'SMS';
  private readonly logger = new Logger('notifications.channel.sms');

  dispatch(account: DispatchAccount, message: RenderedMessage): Promise<void> {
    this.logger.warn(
      `[stub SMS] cuenta "${account.name}" → ${message.to}: ${contentField(
        message.content.body,
      )}`,
    );
    return Promise.resolve();
  }
}
