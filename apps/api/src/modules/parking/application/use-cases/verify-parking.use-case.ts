import { Inject, Injectable } from '@nestjs/common';
import { Parking } from '../../domain/entities/parking.entity';
import { ParkingNotFoundError } from '../../domain/errors/parking-not-found.error';
import {
  PARKING_REPOSITORY,
  type ParkingRepositoryPort,
} from '../ports/parking-repository.port';

/** Backoffice: marca que un admin ha verificado que la plaza existe de verdad. */
@Injectable()
export class VerifyParkingUseCase {
  constructor(
    @Inject(PARKING_REPOSITORY)
    private readonly parkings: ParkingRepositoryPort,
  ) {}

  async execute(id: string): Promise<Parking> {
    const parking = await this.parkings.findById(id);
    if (!parking) throw new ParkingNotFoundError(id);
    return this.parkings.setVerified(id, new Date());
  }
}
