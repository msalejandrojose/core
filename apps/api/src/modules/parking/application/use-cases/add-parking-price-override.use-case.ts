import { Inject, Injectable } from '@nestjs/common';
import { ParkingPriceOverride } from '../../domain/entities/parking-price-override.entity';
import { ParkingNotFoundError } from '../../domain/errors/parking-not-found.error';
import { ParkingPriceOverrideRangeInvalidError } from '../../domain/errors/parking-price-override-range-invalid.error';
import {
  PARKING_REPOSITORY,
  type ParkingRepositoryPort,
} from '../ports/parking-repository.port';
import {
  PARKING_PRICE_OVERRIDE_REPOSITORY,
  type ParkingPriceOverrideRepositoryPort,
} from '../ports/parking-price-override-repository.port';

export interface AddParkingPriceOverrideInput {
  parkingId: string;
  hostUserId: string;
  startDate: Date;
  endDate: Date;
  pricePerDay: number;
  label: string | null;
}

/** Define un precio distinto al base para un rango de fechas (picos de demanda/eventos). */
@Injectable()
export class AddParkingPriceOverrideUseCase {
  constructor(
    @Inject(PARKING_REPOSITORY)
    private readonly parkings: ParkingRepositoryPort,
    @Inject(PARKING_PRICE_OVERRIDE_REPOSITORY)
    private readonly overrides: ParkingPriceOverrideRepositoryPort,
  ) {}

  async execute(
    input: AddParkingPriceOverrideInput,
  ): Promise<ParkingPriceOverride> {
    const { parkingId, hostUserId, startDate, endDate, pricePerDay, label } =
      input;

    if (endDate.getTime() <= startDate.getTime()) {
      throw new ParkingPriceOverrideRangeInvalidError();
    }

    const parking = await this.parkings.findByIdForHost(parkingId, hostUserId);
    if (!parking) throw new ParkingNotFoundError(parkingId);

    return this.overrides.create({
      parkingId,
      startDate,
      endDate,
      pricePerDay,
      label,
    });
  }
}
