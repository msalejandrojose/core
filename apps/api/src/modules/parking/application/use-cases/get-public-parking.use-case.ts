import { Inject, Injectable } from '@nestjs/common';
import { Parking } from '../../domain/entities/parking.entity';
import { ParkingNotFoundError } from '../../domain/errors/parking-not-found.error';
import {
  PARKING_REPOSITORY,
  type ParkingRepositoryPort,
} from '../ports/parking-repository.port';
import {
  HOST_VERIFICATION_REPOSITORY,
  type HostVerificationRepositoryPort,
} from '../ports/host-verification-repository.port';
import {
  REVIEW_REPOSITORY,
  type RatingSummary,
  type ReviewRepositoryPort,
} from '../ports/review-repository.port';

export interface PublicParkingDetail {
  parking: Parking;
  /** El host de la plaza tiene el KYC básico aprobado (TASK-155). */
  hostVerified: boolean;
  /** Media y nº de reseñas del guest sobre la plaza (TASK-154). */
  rating: RatingSummary;
}

/** Ficha pública de una plaza. 404 si no existe o no está `PUBLISHED`. */
@Injectable()
export class GetPublicParkingUseCase {
  constructor(
    @Inject(PARKING_REPOSITORY)
    private readonly parkings: ParkingRepositoryPort,
    @Inject(HOST_VERIFICATION_REPOSITORY)
    private readonly hostVerifications: HostVerificationRepositoryPort,
    @Inject(REVIEW_REPOSITORY)
    private readonly reviews: ReviewRepositoryPort,
  ) {}

  async execute(id: string): Promise<PublicParkingDetail> {
    const parking = await this.parkings.findPublishedById(id);
    if (!parking) throw new ParkingNotFoundError(id);

    const [verification, rating] = await Promise.all([
      this.hostVerifications.findByHostUserId(parking.hostUserId),
      this.reviews.getParkingRatingSummary(id),
    ]);
    return {
      parking,
      hostVerified: verification?.status === 'APPROVED',
      rating,
    };
  }
}
