import { Inject, Injectable, Logger } from '@nestjs/common';
import { mergeStatus } from '../../domain/delivery/delivery-status';
import {
  providerMessageIdFromEvent,
  sendgridEventToStatus,
  type SendgridEvent,
} from '../../domain/delivery/sendgrid-event';
import type {
  DeliveryEvent,
  NotificationDelivery,
} from '../../domain/entities/notification-delivery.entity';
import {
  NOTIFICATION_DELIVERY_REPOSITORY,
  type NotificationDeliveryRepositoryPort,
  type UpdateDeliveryData,
} from '../ports/notification-delivery-repository.port';

const PROVIDER = 'sendgrid';

export interface IngestSendgridEventsResult {
  /** Eventos recibidos. */
  received: number;
  /** Eventos aplicados a una delivery. */
  applied: number;
  /** Eventos sin delivery correlacionada (ignorados). */
  unmatched: number;
}

// Procesa un lote de eventos del Event Webhook de SendGrid y actualiza el estado
// de las deliveries persistidas. Correlaciona por `deliveryId` (custom_arg que
// fijamos al enviar) y, en su defecto, por el prefijo de `sg_message_id`. Los
// eventos sin correlación o sin estado mapeable se ignoran (log-only).
@Injectable()
export class IngestSendgridEventsUseCase {
  private readonly logger = new Logger('notifications.sendgrid.webhook');

  constructor(
    @Inject(NOTIFICATION_DELIVERY_REPOSITORY)
    private readonly deliveries: NotificationDeliveryRepositoryPort,
  ) {}

  async execute(events: SendgridEvent[]): Promise<IngestSendgridEventsResult> {
    let applied = 0;
    let unmatched = 0;

    for (const event of events) {
      const status = sendgridEventToStatus(event.event);
      if (!status) continue; // evento sin efecto en el estado

      const delivery = await this.resolve(event);
      if (!delivery) {
        unmatched++;
        continue;
      }

      await this.deliveries.update(delivery.id, this.patch(delivery, event));
      applied++;
    }

    if (unmatched > 0) {
      this.logger.warn(
        `${unmatched} evento(s) de SendGrid sin delivery correlacionada.`,
      );
    }
    return { received: events.length, applied, unmatched };
  }

  private async resolve(
    event: SendgridEvent,
  ): Promise<NotificationDelivery | null> {
    if (typeof event.deliveryId === 'string' && event.deliveryId !== '') {
      const byId = await this.deliveries.findById(event.deliveryId);
      if (byId) return byId;
    }
    const providerMessageId = providerMessageIdFromEvent(event);
    if (providerMessageId) {
      return this.deliveries.findByProviderMessageId(
        PROVIDER,
        providerMessageId,
      );
    }
    return null;
  }

  private patch(
    delivery: NotificationDelivery,
    event: SendgridEvent,
  ): UpdateDeliveryData {
    const mapped = sendgridEventToStatus(event.event)!;
    const at =
      typeof event.timestamp === 'number'
        ? new Date(event.timestamp * 1000)
        : new Date();

    const historyEntry: DeliveryEvent = {
      type: event.event ?? 'unknown',
      at: at.toISOString(),
      ...(event.reason ? { reason: event.reason } : {}),
    };

    const patch: UpdateDeliveryData = {
      status: mergeStatus(delivery.status, mapped),
      events: [...delivery.events, historyEntry],
      lastEventAt: at,
    };

    if (mapped === 'sent' && !delivery.sentAt) patch.sentAt = at;
    if (mapped === 'delivered' && !delivery.deliveredAt) patch.deliveredAt = at;
    if (
      (mapped === 'bounced' || mapped === 'dropped' || mapped === 'spam') &&
      event.reason
    ) {
      patch.error = event.reason;
    }

    return patch;
  }
}
