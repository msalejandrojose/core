import { Inject, Injectable } from '@nestjs/common';
import { ParkingPriceOverride } from '../../domain/entities/parking-price-override.entity';
import { ParkingNotFoundError } from '../../domain/errors/parking-not-found.error';
import {
  PARKING_REPOSITORY,
  type ParkingRepositoryPort,
} from '../ports/parking-repository.port';
import {
  PARKING_PRICE_OVERRIDE_REPOSITORY,
  type ParkingPriceOverrideRepositoryPort,
} from '../ports/parking-price-override-repository.port';

@Injectable()
export class ListParkingPriceOverridesUseCase {
  constructor(
    @Inject(PARKING_REPOSITORY)
    private readonly parkings: ParkingRepositoryPort,
    @Inject(PARKING_PRICE_OVERRIDE_REPOSITORY)
    private readonly overrides: ParkingPriceOverrideRepositoryPort,
  ) {}

  async execute(
    parkingId: string,
    hostUserId: string,
  ): Promise<ParkingPriceOverride[]> {
    const parking = await this.parkings.findByIdForHost(parkingId, hostUserId);
    if (!parking) throw new ParkingNotFoundError(parkingId);

    return this.overrides.listForParking(parkingId);
  }
}
