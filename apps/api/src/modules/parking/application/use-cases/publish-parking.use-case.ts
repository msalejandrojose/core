import { Inject, Injectable } from '@nestjs/common';
import { canTransitionParkingStatus } from '@core/shared-types';
import { Parking } from '../../domain/entities/parking.entity';
import { ParkingNotFoundError } from '../../domain/errors/parking-not-found.error';
import { InvalidParkingStatusTransitionError } from '../../domain/errors/invalid-parking-status-transition.error';
import {
  PARKING_REPOSITORY,
  type ParkingRepositoryPort,
} from '../ports/parking-repository.port';

/** Publica una plaza (`DRAFT`/`UNPUBLISHED` → `PUBLISHED`), visible y reservable. */
@Injectable()
export class PublishParkingUseCase {
  constructor(
    @Inject(PARKING_REPOSITORY)
    private readonly parkings: ParkingRepositoryPort,
  ) {}

  async execute(id: string, hostUserId: string): Promise<Parking> {
    const parking = await this.parkings.findByIdForHost(id, hostUserId);
    if (!parking) throw new ParkingNotFoundError(id);

    if (!canTransitionParkingStatus(parking.status, 'PUBLISHED')) {
      throw new InvalidParkingStatusTransitionError(
        parking.status,
        'PUBLISHED',
      );
    }

    return this.parkings.update(id, { status: 'PUBLISHED' });
  }
}
