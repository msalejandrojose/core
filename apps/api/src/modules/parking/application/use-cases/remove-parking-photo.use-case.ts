import { Inject, Injectable } from '@nestjs/common';
import { Parking } from '../../domain/entities/parking.entity';
import { ParkingNotFoundError } from '../../domain/errors/parking-not-found.error';
import { ParkingPhotoNotFoundError } from '../../domain/errors/parking-photo-not-found.error';
import {
  PARKING_REPOSITORY,
  type ParkingRepositoryPort,
} from '../ports/parking-repository.port';

@Injectable()
export class RemoveParkingPhotoUseCase {
  constructor(
    @Inject(PARKING_REPOSITORY)
    private readonly parkings: ParkingRepositoryPort,
  ) {}

  async execute(
    parkingId: string,
    hostUserId: string,
    photoId: string,
  ): Promise<Parking> {
    const parking = await this.parkings.findByIdForHost(parkingId, hostUserId);
    if (!parking) throw new ParkingNotFoundError(parkingId);

    if (!parking.photos.some((p) => p.id === photoId)) {
      throw new ParkingPhotoNotFoundError(photoId);
    }

    return this.parkings.removePhoto(parkingId, photoId);
  }
}
