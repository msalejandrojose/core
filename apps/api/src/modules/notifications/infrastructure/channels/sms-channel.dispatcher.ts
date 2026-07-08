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

interface SmsConfig {
  provider?: string;
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
}

const TWILIO_BASE = 'https://api.twilio.com/2010-04-01';

// Entrega por SMS vía la REST API de Twilio. Envía el texto
// (`message.content.body`) al número `message.to` (formato E.164, p.ej.
// +34600111222) y devuelve el `sid` del mensaje como providerMessageId para
// correlacionar con el webhook de estado.
//
// Si la cuenta no trae `accountSid`/`authToken`/`fromNumber` (típico en dev/CI,
// donde el cipher nulo deja la config sin secretos), no llama a Twilio: registra
// el intento y devuelve vacío, para no bloquear el flujo end-to-end. Mismo patrón
// que el dispatcher de WhatsApp.
@Injectable()
@ChannelDispatcher()
export class SmsChannelDispatcher implements ChannelDispatcherPort {
  readonly channel: NotificationChannel = 'SMS';
  private readonly logger = new Logger('notifications.channel.sms');

  async dispatch(
    account: DispatchAccount,
    message: RenderedMessage,
  ): Promise<DispatchResult> {
    const config = account.config as SmsConfig;
    const body = contentField(message.content.body);

    if (!config.accountSid || !config.authToken || !config.fromNumber) {
      this.logger.warn(
        `[stub SMS] cuenta "${account.name}" sin credenciales → ${message.to}: ${body}`,
      );
      return {};
    }

    const url = `${TWILIO_BASE}/Accounts/${encodeURIComponent(
      config.accountSid,
    )}/Messages.json`;
    const auth = Buffer.from(
      `${config.accountSid}:${config.authToken}`,
    ).toString('base64');

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: message.to,
        From: config.fromNumber,
        Body: body,
      }).toString(),
    });

    const payload = (await res.json().catch(() => null)) as {
      sid?: string;
      message?: string;
      error_message?: string;
    } | null;

    if (!res.ok) {
      const detail =
        payload?.message ?? payload?.error_message ?? `HTTP ${res.status}`;
      throw new Error(`Twilio SMS falló: ${detail}`);
    }

    return { providerMessageId: payload?.sid };
  }
}
