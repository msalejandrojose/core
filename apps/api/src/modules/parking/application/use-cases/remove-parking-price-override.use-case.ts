import { Inject, Injectable } from '@nestjs/common';
import { ParkingNotFoundError } from '../../domain/errors/parking-not-found.error';
import { ParkingPriceOverrideNotFoundError } from '../../domain/errors/parking-price-override-not-found.error';
import {
  PARKING_REPOSITORY,
  type ParkingRepositoryPort,
} from '../ports/parking-repository.port';
import {
  PARKING_PRICE_OVERRIDE_REPOSITORY,
  type ParkingPriceOverrideRepositoryPort,
} from '../ports/parking-price-override-repository.port';

@Injectable()
export class RemoveParkingPriceOverrideUseCase {
  constructor(
    @Inject(PARKING_REPOSITORY)
    private readonly parkings: ParkingRepositoryPort,
    @Inject(PARKING_PRICE_OVERRIDE_REPOSITORY)
    private readonly overrides: ParkingPriceOverrideRepositoryPort,
  ) {}

  async execute(
    parkingId: string,
    hostUserId: string,
    overrideId: string,
  ): Promise<void> {
    const parking = await this.parkings.findByIdForHost(parkingId, hostUserId);
    if (!parking) throw new ParkingNotFoundError(parkingId);

    const override = await this.overrides.findByIdForParking(
      overrideId,
      parkingId,
    );
    if (!override) throw new ParkingPriceOverrideNotFoundError(overrideId);

    await this.overrides.delete(overrideId);
  }
}
