import { Inject, Injectable } from '@nestjs/common';
import { canTransitionParkingStatus } from '@core/shared-types';
import { Parking } from '../../domain/entities/parking.entity';
import { ParkingNotFoundError } from '../../domain/errors/parking-not-found.error';
import { InvalidParkingStatusTransitionError } from '../../domain/errors/invalid-parking-status-transition.error';
import {
  PARKING_REPOSITORY,
  type ParkingRepositoryPort,
} from '../ports/parking-repository.port';

/**
 * Backoffice: despublica cualquier plaza (moderación), sin requerir que el
 * operador sea el host. Misma validación de transición que
 * `UnpublishParkingUseCase`.
 */
@Injectable()
export class ModerateUnpublishParkingUseCase {
  constructor(
    @Inject(PARKING_REPOSITORY)
    private readonly parkings: ParkingRepositoryPort,
  ) {}

  async execute(id: string): Promise<Parking> {
    const parking = await this.parkings.findById(id);
    if (!parking) throw new ParkingNotFoundError(id);

    if (!canTransitionParkingStatus(parking.status, 'UNPUBLISHED')) {
      throw new InvalidParkingStatusTransitionError(
        parking.status,
        'UNPUBLISHED',
      );
    }

    return this.parkings.update(id, { status: 'UNPUBLISHED' });
  }
}
