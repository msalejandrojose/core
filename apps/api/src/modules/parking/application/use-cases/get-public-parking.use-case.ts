import { Inject, Injectable } from '@nestjs/common';
import { Parking } from '../../domain/entities/parking.entity';
import { ParkingNotFoundError } from '../../domain/errors/parking-not-found.error';
import {
  PARKING_REPOSITORY,
  type ParkingRepositoryPort,
} from '../ports/parking-repository.port';

/** Ficha pública de una plaza. 404 si no existe o no está `PUBLISHED`. */
@Injectable()
export class GetPublicParkingUseCase {
  constructor(
    @Inject(PARKING_REPOSITORY)
    private readonly parkings: ParkingRepositoryPort,
  ) {}

  async execute(id: string): Promise<Parking> {
    const parking = await this.parkings.findPublishedById(id);
    if (!parking) throw new ParkingNotFoundError(id);
    return parking;
  }
}
