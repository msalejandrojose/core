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

interface PushConfig {
  provider?: string;
  serverKey?: string;
}

const FCM_SEND_URL = 'https://fcm.googleapis.com/fcm/send';

// Entrega por push vía Firebase Cloud Messaging. Usa la HTTP legacy API con la
// `serverKey` de la cuenta (el campo que declara el catálogo de canales) y envía
// una notification `{title, body}` al token de dispositivo `message.to`,
// adjuntando `deepLink` como dato si el mensaje lo trae. Devuelve el `message_id`
// de FCM como providerMessageId.
//
// Si la cuenta no trae `serverKey` (típico en dev/CI, donde el cipher nulo deja
// la config sin secretos), no llama a FCM: registra el intento y devuelve vacío,
// para no bloquear el flujo end-to-end. Mismo patrón que el resto de canales.
//
// Nota: FCM está migrando a la HTTP v1 API (OAuth2 con service account). Cuando
// se aborde, añadir los campos de service account al catálogo PUSH y sustituir
// la autenticación `key=` por un bearer token; la forma del payload es análoga.
@Injectable()
@ChannelDispatcher()
export class PushChannelDispatcher implements ChannelDispatcherPort {
  readonly channel: NotificationChannel = 'PUSH';
  private readonly logger = new Logger('notifications.channel.push');

  async dispatch(
    account: DispatchAccount,
    message: RenderedMessage,
  ): Promise<DispatchResult> {
    const config = account.config as PushConfig;
    const title = contentField(message.content.title);
    const body = contentField(message.content.body);
    const deepLink = contentField(message.content.deepLink);

    if (!config.serverKey) {
      this.logger.warn(
        `[stub push] cuenta "${account.name}" sin serverKey → ${message.to}: ${title}`,
      );
      return {};
    }

    const res = await fetch(FCM_SEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `key=${config.serverKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: message.to,
        notification: { title, body },
        ...(deepLink ? { data: { deepLink } } : {}),
      }),
    });

    const payload = (await res.json().catch(() => null)) as {
      results?: { message_id?: string; error?: string }[];
      failure?: number;
      error?: string;
    } | null;

    if (!res.ok) {
      const detail = payload?.error ?? `HTTP ${res.status}`;
      throw new Error(`FCM push falló: ${detail}`);
    }

    // FCM responde 200 incluso cuando el mensaje individual falla (token
    // inválido, no registrado…): el error viaja en results[0].error.
    const result = payload?.results?.[0];
    if (result?.error) {
      throw new Error(`FCM push falló: ${result.error}`);
    }

    return { providerMessageId: result?.message_id };
  }
}
