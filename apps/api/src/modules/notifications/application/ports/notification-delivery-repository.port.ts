import type { NotificationChannel } from '@core/shared-types';
import type { CursorPage } from '../../../../shared/pagination';
import type {
  DeliveryEvent,
  DeliveryStatus,
  NotificationDelivery,
} from '../../domain/entities/notification-delivery.entity';

export const NOTIFICATION_DELIVERY_REPOSITORY = Symbol(
  'NOTIFICATIONS_DELIVERY_REPOSITORY',
);

export interface CreateDeliveryData {
  messageTypeId: string | null;
  messageTypeKey: string;
  accountId: string | null;
  channel: NotificationChannel;
  provider: string;
  toAddress: string;
  subject: string | null;
  status: DeliveryStatus;
}

export interface UpdateDeliveryData {
  status?: DeliveryStatus;
  providerMessageId?: string | null;
  error?: string | null;
  events?: DeliveryEvent[];
  sentAt?: Date | null;
  deliveredAt?: Date | null;
  lastEventAt?: Date | null;
}

export interface ListDeliveriesOptions {
  limit: number;
  cursor?: string;
  messageTypeKey?: string;
  channel?: NotificationChannel;
  status?: DeliveryStatus;
  toAddress?: string;
  createdFrom?: Date;
  createdTo?: Date;
}

export interface NotificationDeliveryRepositoryPort {
  create(data: CreateDeliveryData): Promise<NotificationDelivery>;
  update(id: string, data: UpdateDeliveryData): Promise<NotificationDelivery>;
  findById(id: string): Promise<NotificationDelivery | null>;
  findByProviderMessageId(
    provider: string,
    providerMessageId: string,
  ): Promise<NotificationDelivery | null>;
  list(opts: ListDeliveriesOptions): Promise<CursorPage<NotificationDelivery>>;
}
