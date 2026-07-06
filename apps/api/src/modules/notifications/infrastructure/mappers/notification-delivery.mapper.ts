import type { NotificationChannel } from '@core/shared-types';
import type {
  DeliveryEvent,
  DeliveryStatus,
  NotificationDelivery,
} from '../../domain/entities/notification-delivery.entity';

export interface NotificationDeliveryRow {
  id: string;
  messageTypeId: string | null;
  messageTypeKey: string;
  accountId: string | null;
  channel: string;
  provider: string;
  toAddress: string;
  subject: string | null;
  status: string;
  providerMessageId: string | null;
  error: string | null;
  events: unknown;
  sentAt: Date | null;
  deliveredAt: Date | null;
  lastEventAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function toEvents(value: unknown): DeliveryEvent[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (e): e is DeliveryEvent =>
      typeof e === 'object' &&
      e !== null &&
      typeof (e as DeliveryEvent).type === 'string' &&
      typeof (e as DeliveryEvent).at === 'string',
  );
}

export function toNotificationDeliveryDomain(
  row: NotificationDeliveryRow,
): NotificationDelivery {
  return {
    id: row.id,
    messageTypeId: row.messageTypeId,
    messageTypeKey: row.messageTypeKey,
    accountId: row.accountId,
    channel: row.channel as NotificationChannel,
    provider: row.provider,
    toAddress: row.toAddress,
    subject: row.subject,
    status: row.status as DeliveryStatus,
    providerMessageId: row.providerMessageId,
    error: row.error,
    events: toEvents(row.events),
    sentAt: row.sentAt,
    deliveredAt: row.deliveredAt,
    lastEventAt: row.lastEventAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
