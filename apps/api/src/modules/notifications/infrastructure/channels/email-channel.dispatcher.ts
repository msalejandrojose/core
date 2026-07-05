import { Inject, Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import type { NotificationChannel } from '@core/shared-types';
import {
  MAILER_PORT,
  type MailerPort,
} from '../../../mailer/application/ports/mailer.port';
import type {
  ChannelDispatcherPort,
  DispatchAccount,
  RenderedMessage,
} from '../../application/ports/channel-dispatcher.port';
import { ChannelDispatcher } from '../../application/ports/channel-dispatcher.decorator';
import { contentField } from './content-field';

interface EmailConfig {
  provider?: string;
  fromEmail?: string;
  fromName?: string;
  apiKey?: string;
}

// Entrega por email. Si la cuenta trae `apiKey` propia, construye un cliente
// Resend por-cuenta (respetando su `fromEmail`/`fromName`). Si no (típico en
// dev/CI, donde el cipher nulo deja la config sin secretos reales), delega en el
// `MailerPort` global (Resend por env o NullMailer), para no bloquear el flujo.
@Injectable()
@ChannelDispatcher()
export class EmailChannelDispatcher implements ChannelDispatcherPort {
  readonly channel: NotificationChannel = 'EMAIL';
  private readonly logger = new Logger('notifications.channel.email');

  constructor(@Inject(MAILER_PORT) private readonly mailer: MailerPort) {}

  async dispatch(
    account: DispatchAccount,
    message: RenderedMessage,
  ): Promise<void> {
    const config = account.config as EmailConfig;
    const subject = contentField(message.content.subject);
    const html = contentField(message.content.html);
    const text = contentField(message.content.text);

    if (config.apiKey) {
      const from = config.fromName
        ? `${config.fromName} <${config.fromEmail ?? ''}>`
        : (config.fromEmail ?? '');
      const { error } = await new Resend(config.apiKey).emails.send({
        from,
        to: message.to,
        subject,
        html,
        text,
      });
      if (error) throw new Error(error.message);
      return;
    }

    this.logger.debug(
      `Cuenta "${account.name}" sin apiKey propia → envío vía MailerPort global.`,
    );
    await this.mailer.send({ to: message.to, subject, html, text });
  }
}
