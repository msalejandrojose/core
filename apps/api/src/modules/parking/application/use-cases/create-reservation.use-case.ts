import { Inject, Injectable, Logger } from '@nestjs/common';
import { isBookableParkingStatus } from '@core/shared-types';
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from '../../../iam/application/ports/user-repository.port';
import { SendNotificationUseCase } from '../../../notifications/application/use-cases/send-notification.use-case';
import { Reservation } from '../../domain/entities/reservation.entity';
import { calculateReservationTotal } from '../../domain/pricing';
import { ParkingNotBookableError } from '../../domain/errors/parking-not-bookable.error';
import { ParkingNotAvailableError } from '../../domain/errors/parking-not-available.error';
import { ReservationDateRangeInvalidError } from '../../domain/errors/reservation-date-range-invalid.error';
import { PARKING_RESERVATION_REQUESTED_MESSAGE_TYPE_KEY } from '../notification-message-types';
import {
  PARKING_REPOSITORY,
  type ParkingRepositoryPort,
} from '../ports/parking-repository.port';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepositoryPort,
} from '../ports/reservation-repository.port';
import {
  PARKING_PRICE_OVERRIDE_REPOSITORY,
  type ParkingPriceOverrideRepositoryPort,
} from '../ports/parking-price-override-repository.port';

export interface CreateReservationInput {
  parkingId: string;
  guestUserId: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Crea una reserva en `PENDING`. Calcula `totalAmount` noche a noche
 * (`pricePerDay` base, o el precio especial de `ParkingPriceOverride` si la
 * noche cae en uno, TASK-146) y valida anti-solape contra bloqueos del host y
 * otras reservas activas. Avisa al host por email (TASK-149) — un fallo de
 * envío no revierte la reserva ya creada, solo se registra.
 */
@Injectable()
export class CreateReservationUseCase {
  private readonly logger = new Logger('parking.reservation-notifications');

  constructor(
    @Inject(PARKING_REPOSITORY)
    private readonly parkings: ParkingRepositoryPort,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservations: ReservationRepositoryPort,
    @Inject(PARKING_PRICE_OVERRIDE_REPOSITORY)
    private readonly priceOverrides: ParkingPriceOverrideRepositoryPort,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepositoryPort,
    private readonly sendNotification: SendNotificationUseCase,
  ) {}

  async execute(input: CreateReservationInput): Promise<Reservation> {
    const { parkingId, guestUserId, startDate, endDate } = input;

    if (endDate.getTime() <= startDate.getTime()) {
      throw new ReservationDateRangeInvalidError();
    }

    const parking = await this.parkings.findById(parkingId);
    if (!parking || !isBookableParkingStatus(parking.status)) {
      throw new ParkingNotBookableError(parkingId);
    }

    const overlaps = await this.reservations.hasOverlap(
      parkingId,
      startDate,
      endDate,
    );
    if (overlaps) {
      throw new ParkingNotAvailableError(parkingId, startDate, endDate);
    }

    const overlappingPrices = await this.priceOverrides.listOverlapping(
      parkingId,
      startDate,
      endDate,
    );
    const totalAmount = calculateReservationTotal(
      parking.pricePerDay,
      overlappingPrices,
      startDate,
      endDate,
    );

    const reservation = await this.reservations.create({
      parkingId,
      guestUserId,
      startDate,
      endDate,
      totalAmount,
    });

    await this.notifyHost(parking, reservation);

    return reservation;
  }

  private async notifyHost(
    parking: { hostUserId: string; title: string },
    reservation: Reservation,
  ): Promise<void> {
    try {
      const host = await this.users.findById(parking.hostUserId);
      if (!host) return;

      await this.sendNotification.executeByKey(
        PARKING_RESERVATION_REQUESTED_MESSAGE_TYPE_KEY,
        {
          to: host.email,
          variables: {
            parkingTitle: parking.title,
            startDate: reservation.startDate.toISOString().slice(0, 10),
            endDate: reservation.endDate.toISOString().slice(0, 10),
            totalAmount: reservation.totalAmount,
          },
        },
      );
    } catch (err) {
      this.logger.warn(
        `No se pudo avisar al host de la reserva ${reservation.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
