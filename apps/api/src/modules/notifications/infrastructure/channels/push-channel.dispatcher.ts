import { Injectable, Logger } from '@nestjs/common';
import type { NotificationChannel } from '@core/shared-types';
import type {
  ChannelDispatcherPort,
  DispatchAccount,
  DispatchResult,
  RenderedMessage,
} from '../../application/ports/channel-dispatcher.port';
import { ChannelDispatcher } from '../../application/ports/channel-dispatcher.decorator';
import { contentField } from './content-field';

// Stub del canal push (FCM). Igual que el de SMS: registra y no envía. La
// implementación real es una iteración futura.
@Injectable()
@ChannelDispatcher()
export class PushChannelDispatcher implements ChannelDispatcherPort {
  readonly channel: NotificationChannel = 'PUSH';
  private readonly logger = new Logger('notifications.channel.push');

  dispatch(
    account: DispatchAccount,
    message: RenderedMessage,
  ): Promise<DispatchResult> {
    this.logger.warn(
      `[stub push] cuenta "${account.name}" → ${message.to}: ${contentField(
        message.content.title,
      )}`,
    );
    return Promise.resolve({});
  }
}
