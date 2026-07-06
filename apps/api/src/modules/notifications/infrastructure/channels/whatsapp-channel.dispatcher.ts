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

interface WhatsappConfig {
  provider?: string;
  phoneNumberId?: string;
  accessToken?: string;
  apiVersion?: string;
}

const DEFAULT_API_VERSION = 'v21.0';

// Entrega por WhatsApp vía Meta WhatsApp Cloud API (Graph API). Envía un mensaje
// de texto al número `message.to` (formato E.164 sin '+', p.ej. 34600111222) y
// devuelve el `wamid` como providerMessageId para correlacionar con el webhook.
//
// Si la cuenta no trae `accessToken`/`phoneNumberId` (típico en dev/CI, donde el
// cipher nulo deja la config sin secretos), no llama a Meta: registra el intento
// y devuelve vacío, para no bloquear el flujo end-to-end.
@Injectable()
@ChannelDispatcher()
export class WhatsappChannelDispatcher implements ChannelDispatcherPort {
  readonly channel: NotificationChannel = 'WHATSAPP';
  private readonly logger = new Logger('notifications.channel.whatsapp');

  async dispatch(
    account: DispatchAccount,
    message: RenderedMessage,
  ): Promise<DispatchResult> {
    const config = account.config as WhatsappConfig;
    const body = contentField(message.content.body);

    if (!config.accessToken || !config.phoneNumberId) {
      this.logger.warn(
        `[stub WhatsApp] cuenta "${account.name}" sin credenciales → ${message.to}: ${body}`,
      );
      return {};
    }

    const apiVersion = config.apiVersion || DEFAULT_API_VERSION;
    const url = `https://graph.facebook.com/${apiVersion}/${config.phoneNumberId}/messages`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: message.to,
        type: 'text',
        text: { preview_url: false, body },
      }),
    });

    const payload = (await res.json().catch(() => null)) as {
      messages?: { id?: string }[];
      error?: { message?: string };
    } | null;

    if (!res.ok) {
      const detail = payload?.error?.message ?? `HTTP ${res.status}`;
      throw new Error(`WhatsApp Cloud API falló: ${detail}`);
    }

    return { providerMessageId: payload?.messages?.[0]?.id };
  }
}
