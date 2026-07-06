import { Inject, Injectable } from '@nestjs/common';
import type { CursorPage } from '../../../../shared/pagination';
import type { NotificationDelivery } from '../../domain/entities/notification-delivery.entity';
import {
  NOTIFICATION_DELIVERY_REPOSITORY,
  type ListDeliveriesOptions,
  type NotificationDeliveryRepositoryPort,
} from '../ports/notification-delivery-repository.port';

@Injectable()
export class ListDeliveriesUseCase {
  constructor(
    @Inject(NOTIFICATION_DELIVERY_REPOSITORY)
    private readonly deliveries: NotificationDeliveryRepositoryPort,
  ) {}

  execute(
    opts: ListDeliveriesOptions,
  ): Promise<CursorPage<NotificationDelivery>> {
    return this.deliveries.list(opts);
  }
}
