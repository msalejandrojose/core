import { Inject, Injectable } from '@nestjs/common';
import { isBookableParkingStatus } from '@core/shared-types';
import { Reservation } from '../../domain/entities/reservation.entity';
import { calculateReservationTotal } from '../../domain/pricing';
import { ParkingNotBookableError } from '../../domain/errors/parking-not-bookable.error';
import { ParkingNotAvailableError } from '../../domain/errors/parking-not-available.error';
import { ReservationDateRangeInvalidError } from '../../domain/errors/reservation-date-range-invalid.error';
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
 * otras reservas activas.
 */
@Injectable()
export class CreateReservationUseCase {
  constructor(
    @Inject(PARKING_REPOSITORY)
    private readonly parkings: ParkingRepositoryPort,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservations: ReservationRepositoryPort,
    @Inject(PARKING_PRICE_OVERRIDE_REPOSITORY)
    private readonly priceOverrides: ParkingPriceOverrideRepositoryPort,
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

    return this.reservations.create({
      parkingId,
      guestUserId,
      startDate,
      endDate,
      totalAmount,
    });
  }
}
