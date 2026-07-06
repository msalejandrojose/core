import { Inject, Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { MailService } from '@sendgrid/mail';
import type { NotificationChannel } from '@core/shared-types';
import {
  MAILER_PORT,
  type MailerPort,
} from '../../../mailer/application/ports/mailer.port';
import type {
  ChannelDispatcherPort,
  DispatchAccount,
  DispatchOptions,
  DispatchResult,
  RenderedMessage,
} from '../../application/ports/channel-dispatcher.port';
import { ChannelDispatcher } from '../../application/ports/channel-dispatcher.decorator';
import { contentField } from './content-field';
import { resolveEmailProvider } from './email-provider';

interface EmailConfig {
  provider?: string;
  fromEmail?: string;
  fromName?: string;
  apiKey?: string;
}

interface EmailPayload {
  from: string;
  fromEmail: string;
  fromName?: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Entrega por email. Enruta por `config.provider`:
//   - resend   → cliente Resend por-cuenta (default; retrocompatible).
//   - sendgrid → cliente SendGrid (@sendgrid/mail) por-cuenta.
// Si la cuenta no trae `apiKey` propia (típico en dev/CI, donde el cipher nulo
// deja la config sin secretos reales), delega en el `MailerPort` global (Resend
// por env o NullMailer), para no bloquear el flujo.
//
// Devuelve el `providerMessageId` del proveedor para correlacionar los eventos
// del webhook con la delivery persistida.
@Injectable()
@ChannelDispatcher()
export class EmailChannelDispatcher implements ChannelDispatcherPort {
  readonly channel: NotificationChannel = 'EMAIL';
  private readonly logger = new Logger('notifications.channel.email');

  constructor(@Inject(MAILER_PORT) private readonly mailer: MailerPort) {}

  async dispatch(
    account: DispatchAccount,
    message: RenderedMessage,
    options?: DispatchOptions,
  ): Promise<DispatchResult> {
    const config = account.config as EmailConfig;
    const fromEmail = config.fromEmail ?? '';
    const payload: EmailPayload = {
      from: config.fromName ? `${config.fromName} <${fromEmail}>` : fromEmail,
      fromEmail,
      fromName: config.fromName,
      to: message.to,
      subject: contentField(message.content.subject),
      html: contentField(message.content.html),
      text: contentField(message.content.text),
    };

    switch (resolveEmailProvider(config)) {
      case 'sendgrid':
        return this.sendWithSendgrid(config.apiKey!, payload, options);
      case 'resend':
        return this.sendWithResend(config.apiKey!, payload);
      case 'fallback':
        this.logger.debug(
          `Cuenta "${account.name}" sin apiKey propia → envío vía MailerPort global.`,
        );
        await this.mailer.send({
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        });
        return {};
    }
  }

  private async sendWithResend(
    apiKey: string,
    p: EmailPayload,
  ): Promise<DispatchResult> {
    const { data, error } = await new Resend(apiKey).emails.send({
      from: p.from,
      to: p.to,
      subject: p.subject,
      html: p.html,
      text: p.text,
    });
    if (error) throw new Error(error.message);
    return { providerMessageId: data?.id };
  }

  private async sendWithSendgrid(
    apiKey: string,
    p: EmailPayload,
    options?: DispatchOptions,
  ): Promise<DispatchResult> {
    // Instancia por-cuenta (no el singleton global) para no compartir apiKey
    // entre cuentas concurrentes.
    const client = new MailService();
    client.setApiKey(apiKey);
    const [response] = await client.send({
      to: p.to,
      from: p.fromName ? { email: p.fromEmail, name: p.fromName } : p.fromEmail,
      subject: p.subject,
      html: p.html,
      ...(p.text ? { text: p.text } : {}),
      // custom_args se devuelven en cada evento del webhook → correlación.
      ...(options?.deliveryId
        ? { customArgs: { deliveryId: options.deliveryId } }
        : {}),
    });
    const headers = (response as { headers?: Record<string, unknown> }).headers;
    const headerId = headers?.['x-message-id'];
    return {
      providerMessageId: typeof headerId === 'string' ? headerId : undefined,
    };
  }
}
