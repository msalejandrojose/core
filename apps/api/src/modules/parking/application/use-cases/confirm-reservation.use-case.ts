import { Inject, Injectable, Logger } from '@nestjs/common';
import { canTransitionReservationStatus } from '@core/shared-types';
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from '../../../iam/application/ports/user-repository.port';
import { SendNotificationUseCase } from '../../../notifications/application/use-cases/send-notification.use-case';
import { Reservation } from '../../domain/entities/reservation.entity';
import { ReservationNotFoundError } from '../../domain/errors/reservation-not-found.error';
import { InvalidReservationStatusTransitionError } from '../../domain/errors/invalid-reservation-status-transition.error';
import { PARKING_RESERVATION_CONFIRMED_MESSAGE_TYPE_KEY } from '../notification-message-types';
import {
  PARKING_REPOSITORY,
  type ParkingRepositoryPort,
} from '../ports/parking-repository.port';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepositoryPort,
} from '../ports/reservation-repository.port';

/**
 * El host confirma una reserva pendiente sobre una de sus plazas. Avisa al
 * huésped por email (TASK-149) — un fallo de envío no revierte la
 * confirmación ya persistida, solo se registra.
 */
@Injectable()
export class ConfirmReservationUseCase {
  private readonly logger = new Logger('parking.reservation-notifications');

  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservations: ReservationRepositoryPort,
    @Inject(PARKING_REPOSITORY)
    private readonly parkings: ParkingRepositoryPort,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepositoryPort,
    private readonly sendNotification: SendNotificationUseCase,
  ) {}

  async execute(id: string, hostUserId: string): Promise<Reservation> {
    const reservation = await this.reservations.findByIdForHost(id, hostUserId);
    if (!reservation) throw new ReservationNotFoundError(id);

    if (!canTransitionReservationStatus(reservation.status, 'CONFIRMED')) {
      throw new InvalidReservationStatusTransitionError(
        reservation.status,
        'CONFIRMED',
      );
    }

    const confirmed = await this.reservations.updateStatus(id, 'CONFIRMED');
    await this.notifyGuest(confirmed);
    return confirmed;
  }

  private async notifyGuest(reservation: Reservation): Promise<void> {
    try {
      const [guest, parking] = await Promise.all([
        this.users.findById(reservation.guestUserId),
        this.parkings.findById(reservation.parkingId),
      ]);
      if (!guest || !parking) return;

      await this.sendNotification.executeByKey(
        PARKING_RESERVATION_CONFIRMED_MESSAGE_TYPE_KEY,
        {
          to: guest.email,
          variables: {
            parkingTitle: parking.title,
            address: parking.address,
            startDate: reservation.startDate.toISOString().slice(0, 10),
            endDate: reservation.endDate.toISOString().slice(0, 10),
            totalAmount: reservation.totalAmount,
          },
        },
      );
    } catch (err) {
      this.logger.warn(
        `No se pudo avisar al huésped de la reserva ${reservation.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
