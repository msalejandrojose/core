import { Inject, Injectable } from '@nestjs/common';
import type { NotificationDelivery } from '../../domain/entities/notification-delivery.entity';
import { DeliveryNotFoundError } from '../../domain/errors/delivery-not-found.error';
import {
  NOTIFICATION_DELIVERY_REPOSITORY,
  type NotificationDeliveryRepositoryPort,
} from '../ports/notification-delivery-repository.port';

@Injectable()
export class GetDeliveryUseCase {
  constructor(
    @Inject(NOTIFICATION_DELIVERY_REPOSITORY)
    private readonly deliveries: NotificationDeliveryRepositoryPort,
  ) {}

  async execute(id: string): Promise<NotificationDelivery> {
    const delivery = await this.deliveries.findById(id);
    if (!delivery) throw new DeliveryNotFoundError(id);
    return delivery;
  }
}
