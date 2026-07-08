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
const DEFAULT_TEMPLATE_LANGUAGE = 'es_ES';

// Cuerpo del mensaje que se manda a la Cloud API, según el modo:
//   - texto libre (`type: 'text'`): válido solo dentro de la ventana de 24h.
//   - plantilla (`type: 'template'`): único modo para iniciar conversación.
type WhatsappMessagePayload =
  | { type: 'text'; text: { preview_url: boolean; body: string } }
  | {
      type: 'template';
      template: {
        name: string;
        language: { code: string };
        components?: Array<{
          type: 'body';
          parameters: Array<{ type: 'text'; text: string }>;
        }>;
      };
    };

// Entrega por WhatsApp vía Meta WhatsApp Cloud API (Graph API). Soporta dos modos
// según el contenido del mensaje:
//   - `templateName` presente → mensaje de PLANTILLA (`type: template`), con su
//     idioma y variables de cuerpo. Es el único modo que permite INICIAR una
//     conversación (Meta lo exige fuera de la ventana de 24h).
//   - si no → mensaje de TEXTO libre (`type: text`), válido solo dentro de la
//     ventana de 24h de una conversación abierta por el usuario.
// Devuelve el `wamid` como providerMessageId para correlacionar con el webhook.
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
    const templateName = contentField(message.content.templateName);
    const isTemplate = templateName.trim() !== '';
    const payload = isTemplate
      ? this.buildTemplatePayload(message, templateName)
      : this.buildTextPayload(message);

    if (!config.accessToken || !config.phoneNumberId) {
      const preview = isTemplate
        ? `plantilla "${templateName}"`
        : contentField(message.content.body);
      this.logger.warn(
        `[stub WhatsApp] cuenta "${account.name}" sin credenciales → ${message.to}: ${preview}`,
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
        ...payload,
      }),
    });

    const resBody = (await res.json().catch(() => null)) as {
      messages?: { id?: string }[];
      error?: { message?: string };
    } | null;

    if (!res.ok) {
      const detail = resBody?.error?.message ?? `HTTP ${res.status}`;
      throw new Error(`WhatsApp Cloud API falló: ${detail}`);
    }

    return { providerMessageId: resBody?.messages?.[0]?.id };
  }

  private buildTextPayload(message: RenderedMessage): WhatsappMessagePayload {
    return {
      type: 'text',
      text: { preview_url: false, body: contentField(message.content.body) },
    };
  }

  private buildTemplatePayload(
    message: RenderedMessage,
    templateName: string,
  ): WhatsappMessagePayload {
    const language =
      contentField(message.content.templateLanguage).trim() ||
      DEFAULT_TEMPLATE_LANGUAGE;
    // Una variable por línea, en orden. Se ignoran líneas vacías.
    const params = contentField(message.content.templateParams)
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '');

    return {
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        ...(params.length > 0
          ? {
              components: [
                {
                  type: 'body',
                  parameters: params.map((text) => ({ type: 'text', text })),
                },
              ],
            }
          : {}),
      },
    };
  }
}
