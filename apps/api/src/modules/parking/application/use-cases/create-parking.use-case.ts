import { Inject, Injectable } from '@nestjs/common';
import { Parking } from '../../domain/entities/parking.entity';
import {
  PARKING_REPOSITORY,
  type ParkingRepositoryPort,
} from '../ports/parking-repository.port';

export interface CreateParkingInput {
  hostUserId: string;
  title: string;
  description?: string | null;
  address: string;
  latitude: number;
  longitude: number;
  postalCodeId?: string | null;
  accessInstructions?: string | null;
  pricePerDay: number;
}

/** Alta de una plaza. Nace en `DRAFT`: el host la completa antes de publicarla. */
@Injectable()
export class CreateParkingUseCase {
  constructor(
    @Inject(PARKING_REPOSITORY)
    private readonly parkings: ParkingRepositoryPort,
  ) {}

  execute(input: CreateParkingInput): Promise<Parking> {
    return this.parkings.create({
      hostUserId: input.hostUserId,
      title: input.title,
      description: input.description ?? null,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      postalCodeId: input.postalCodeId ?? null,
      accessInstructions: input.accessInstructions ?? null,
      pricePerDay: input.pricePerDay,
    });
  }
}
