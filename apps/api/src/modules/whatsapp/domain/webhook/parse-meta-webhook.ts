import type { WhatsappMessageStatus } from '../entities/whatsapp-message.entity';

// Parser puro (sin infra) del payload del webhook de la WhatsApp Cloud API de
// Meta. Un solo POST puede traer varias `entry`, cada una con varios `changes`,
// y cada change un `value` con `messages` (entrantes) y/o `statuses`
// (actualizaciones de entrega de mensajes que enviamos). Extraemos ambos en
// listas planas y normalizadas, ignorando lo que no entendemos.
//
// Referencia de forma (resumida):
// {
//   object: 'whatsapp_business_account',
//   entry: [{ changes: [{ value: {
//     metadata: { phone_number_id },
//     contacts: [{ wa_id, profile: { name } }],
//     messages: [{ from, id, timestamp, type, text: { body } }],
//     statuses: [{ id, status, timestamp, recipient_id }],
//   } }] }],
// }

export interface InboundWhatsappMessage {
  /** Número de negocio que recibe (Meta phone_number_id). */
  phoneNumberId: string;
  /** Teléfono del contacto (E.164 sin '+'). */
  from: string;
  contactName: string | null;
  waMessageId: string;
  body: string;
  timestamp: Date;
}

export interface InboundStatusUpdate {
  phoneNumberId: string;
  waMessageId: string;
  status: WhatsappMessageStatus;
  timestamp: Date;
}

export interface ParsedMetaWebhook {
  messages: InboundWhatsappMessage[];
  statuses: InboundStatusUpdate[];
}

const KNOWN_STATUSES: Record<string, WhatsappMessageStatus> = {
  sent: 'sent',
  delivered: 'delivered',
  read: 'read',
  failed: 'failed',
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

// Meta manda el timestamp como segundos epoch en string. Si falta o es inválido
// usamos la hora actual para no perder el mensaje.
function parseTimestamp(value: unknown): Date {
  const raw = typeof value === 'string' ? Number(value) : Number(value);
  if (Number.isFinite(raw) && raw > 0) return new Date(raw * 1000);
  return new Date();
}

export function parseMetaWebhook(payload: unknown): ParsedMetaWebhook {
  const messages: InboundWhatsappMessage[] = [];
  const statuses: InboundStatusUpdate[] = [];

  const root = asRecord(payload);
  for (const entry of asArray(root?.entry)) {
    for (const change of asArray(asRecord(entry)?.changes)) {
      const value = asRecord(asRecord(change)?.value);
      if (!value) continue;

      const phoneNumberId = asString(asRecord(value.metadata)?.phone_number_id);
      if (!phoneNumberId) continue;

      // Índice wa_id → nombre de perfil, para nombrar la conversación.
      const names = new Map<string, string>();
      for (const contact of asArray(value.contacts)) {
        const c = asRecord(contact);
        const waId = asString(c?.wa_id);
        const name = asString(asRecord(c?.profile)?.name);
        if (waId && name) names.set(waId, name);
      }

      for (const message of asArray(value.messages)) {
        const m = asRecord(message);
        const from = asString(m?.from);
        const waMessageId = asString(m?.id);
        if (!from || !waMessageId) continue;
        // Solo mensajes de texto en el MVP; otros tipos se registran como body
        // descriptivo para no perder el hilo.
        const type = asString(m?.type) ?? 'unknown';
        const body =
          type === 'text'
            ? (asString(asRecord(m?.text)?.body) ?? '')
            : `[${type}]`;
        messages.push({
          phoneNumberId,
          from,
          contactName: names.get(from) ?? null,
          waMessageId,
          body,
          timestamp: parseTimestamp(m?.timestamp),
        });
      }

      for (const status of asArray(value.statuses)) {
        const s = asRecord(status);
        const waMessageId = asString(s?.id);
        const mapped = KNOWN_STATUSES[asString(s?.status) ?? ''];
        if (!waMessageId || !mapped) continue;
        statuses.push({
          phoneNumberId,
          waMessageId,
          status: mapped,
          timestamp: parseTimestamp(s?.timestamp),
        });
      }
    }
  }

  return { messages, statuses };
}
