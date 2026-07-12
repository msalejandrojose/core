import { Inject, Injectable } from '@nestjs/common';
import { Parking } from '../../domain/entities/parking.entity';
import { ParkingNotFoundError } from '../../domain/errors/parking-not-found.error';
import {
  PARKING_REPOSITORY,
  type ParkingRepositoryPort,
} from '../ports/parking-repository.port';

export interface UpdateParkingInput {
  title?: string;
  description?: string | null;
  address?: string;
  latitude?: number;
  longitude?: number;
  postalCodeId?: string | null;
  accessInstructions?: string | null;
  pricePerDay?: number;
}

/** Edita los datos de una plaza propia. No toca `status` (ver Publish/Unpublish). */
@Injectable()
export class UpdateParkingUseCase {
  constructor(
    @Inject(PARKING_REPOSITORY)
    private readonly parkings: ParkingRepositoryPort,
  ) {}

  async execute(
    id: string,
    hostUserId: string,
    input: UpdateParkingInput,
  ): Promise<Parking> {
    const parking = await this.parkings.findByIdForHost(id, hostUserId);
    if (!parking) throw new ParkingNotFoundError(id);

    return this.parkings.update(id, input);
  }
}
