import { Inject, Injectable, Logger } from '@nestjs/common';
import { parseMetaWebhook } from '../../domain/webhook/parse-meta-webhook';
import {
  WHATSAPP_ACCOUNT_RESOLVER,
  type WhatsappAccountResolverPort,
} from '../ports/whatsapp-account-resolver.port';
import {
  WHATSAPP_MESSAGE_REPOSITORY,
  type WhatsappMessageRepositoryPort,
} from '../ports/whatsapp-message-repository.port';
import {
  WHATSAPP_REALTIME,
  type WhatsappRealtimePort,
} from '../ports/whatsapp-realtime.port';
import { RecordWhatsappMessageService } from '../services/record-whatsapp-message.service';

export interface IngestResult {
  messages: number;
  statuses: number;
  skipped: number;
}

// Procesa un POST del webhook de Meta ya verificado: persiste los mensajes
// entrantes (deduplicando por wamid) y aplica las actualizaciones de estado de
// los salientes. Nunca lanza por un evento suelto: un fallo puntual no debe
// hacer que Meta reintente todo el lote.
@Injectable()
export class IngestInboundWebhookUseCase {
  private readonly logger = new Logger('whatsapp.ingest');

  constructor(
    @Inject(WHATSAPP_ACCOUNT_RESOLVER)
    private readonly accounts: WhatsappAccountResolverPort,
    @Inject(WHATSAPP_MESSAGE_REPOSITORY)
    private readonly messages: WhatsappMessageRepositoryPort,
    @Inject(WHATSAPP_REALTIME)
    private readonly realtime: WhatsappRealtimePort,
    private readonly recorder: RecordWhatsappMessageService,
  ) {}

  async execute(payload: unknown): Promise<IngestResult> {
    const { messages, statuses } = parseMetaWebhook(payload);
    const result: IngestResult = { messages: 0, statuses: 0, skipped: 0 };

    for (const incoming of messages) {
      try {
        const account = await this.accounts.resolveByPhoneNumberId(
          incoming.phoneNumberId,
        );
        if (!account) {
          this.logger.warn(
            `Sin cuenta para phone_number_id=${incoming.phoneNumberId}; mensaje ignorado.`,
          );
          result.skipped++;
          continue;
        }
        if (await this.messages.existsByWaMessageId(incoming.waMessageId)) {
          result.skipped++;
          continue;
        }
        await this.recorder.record({
          accountId: account.id,
          contactPhone: incoming.from,
          contactName: incoming.contactName,
          direction: 'INBOUND',
          waMessageId: incoming.waMessageId,
          body: incoming.body,
          status: 'received',
          timestamp: incoming.timestamp,
        });
        result.messages++;
      } catch (err) {
        this.logger.error(
          `Fallo procesando mensaje entrante ${incoming.waMessageId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        result.skipped++;
      }
    }

    for (const update of statuses) {
      try {
        const message = await this.messages.updateStatusByWaMessageId(
          update.waMessageId,
          update.status,
        );
        if (!message) {
          result.skipped++;
          continue;
        }
        this.realtime.broadcastStatus({
          conversationId: message.conversationId,
          message,
        });
        result.statuses++;
      } catch (err) {
        this.logger.error(
          `Fallo aplicando estado ${update.status} a ${update.waMessageId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        result.skipped++;
      }
    }

    return result;
  }
}
