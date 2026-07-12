import { Inject, Injectable } from '@nestjs/common';
import { Parking } from '../../domain/entities/parking.entity';
import { ParkingNotFoundError } from '../../domain/errors/parking-not-found.error';
import {
  PARKING_REPOSITORY,
  type ParkingRepositoryPort,
} from '../ports/parking-repository.port';

@Injectable()
export class GetParkingUseCase {
  constructor(
    @Inject(PARKING_REPOSITORY)
    private readonly parkings: ParkingRepositoryPort,
  ) {}

  async execute(id: string, hostUserId: string): Promise<Parking> {
    const parking = await this.parkings.findByIdForHost(id, hostUserId);
    if (!parking) throw new ParkingNotFoundError(id);
    return parking;
  }
}
