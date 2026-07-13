import { Inject, Injectable } from '@nestjs/common';
import { Parking } from '../../domain/entities/parking.entity';
import { ParkingNotFoundError } from '../../domain/errors/parking-not-found.error';
import {
  PARKING_REPOSITORY,
  type ParkingRepositoryPort,
} from '../ports/parking-repository.port';

/** Backoffice: revoca la verificación de una plaza (p.ej. si se detecta que ya no aplica). */
@Injectable()
export class UnverifyParkingUseCase {
  constructor(
    @Inject(PARKING_REPOSITORY)
    private readonly parkings: ParkingRepositoryPort,
  ) {}

  async execute(id: string): Promise<Parking> {
    const parking = await this.parkings.findById(id);
    if (!parking) throw new ParkingNotFoundError(id);
    return this.parkings.setVerified(id, null);
  }
}
