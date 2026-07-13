import { Inject, Injectable } from '@nestjs/common';
import { isBookableParkingStatus } from '@core/shared-types';
import { calculateReservationTotal } from '../../domain/pricing';
import { ParkingNotBookableError } from '../../domain/errors/parking-not-bookable.error';
import { ReservationDateRangeInvalidError } from '../../domain/errors/reservation-date-range-invalid.error';
import {
  PARKING_REPOSITORY,
  type ParkingRepositoryPort,
} from '../ports/parking-repository.port';
import {
  PARKING_PRICE_OVERRIDE_REPOSITORY,
  type ParkingPriceOverrideRepositoryPort,
} from '../ports/parking-price-override-repository.port';

export interface ParkingPriceQuote {
  nights: number;
  totalAmount: number;
  pricePerDayAverage: number;
}

/**
 * Precio total de una plaza para un rango de fechas sin crear reserva — usado
 * por el buscador público (TASK-147) para mostrar el precio real (con
 * precios dinámicos por fecha, TASK-146) antes de reservar.
 */
@Injectable()
export class GetParkingPriceQuoteUseCase {
  constructor(
    @Inject(PARKING_REPOSITORY)
    private readonly parkings: ParkingRepositoryPort,
    @Inject(PARKING_PRICE_OVERRIDE_REPOSITORY)
    private readonly overrides: ParkingPriceOverrideRepositoryPort,
  ) {}

  async execute(
    parkingId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ParkingPriceQuote> {
    if (endDate.getTime() <= startDate.getTime()) {
      throw new ReservationDateRangeInvalidError();
    }

    const parking = await this.parkings.findById(parkingId);
    if (!parking || !isBookableParkingStatus(parking.status)) {
      throw new ParkingNotBookableError(parkingId);
    }

    const overlapping = await this.overrides.listOverlapping(
      parkingId,
      startDate,
      endDate,
    );
    const totalAmount = calculateReservationTotal(
      parking.pricePerDay,
      overlapping,
      startDate,
      endDate,
    );
    const nights = Math.round(
      (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
    );
    return {
      nights,
      totalAmount,
      pricePerDayAverage: Math.round((totalAmount / nights) * 100) / 100,
    };
  }
}
