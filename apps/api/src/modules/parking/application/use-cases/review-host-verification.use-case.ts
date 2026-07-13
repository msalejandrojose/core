import { Inject, Injectable } from '@nestjs/common';
import { canTransitionHostVerificationStatus } from '@core/shared-types';
import { HostVerification } from '../../domain/entities/host-verification.entity';
import { HostVerificationNotFoundError } from '../../domain/errors/host-verification-not-found.error';
import { InvalidHostVerificationTransitionError } from '../../domain/errors/invalid-host-verification-transition.error';
import {
  HOST_VERIFICATION_REPOSITORY,
  type HostVerificationRepositoryPort,
} from '../ports/host-verification-repository.port';

export interface ReviewHostVerificationInput {
  id: string;
  reviewerUserId: string;
  approve: boolean;
  rejectionReason?: string;
}

/** Backoffice: aprueba o rechaza una solicitud de verificación de host. */
@Injectable()
export class ReviewHostVerificationUseCase {
  constructor(
    @Inject(HOST_VERIFICATION_REPOSITORY)
    private readonly hostVerifications: HostVerificationRepositoryPort,
  ) {}

  async execute(input: ReviewHostVerificationInput): Promise<HostVerification> {
    const verification = await this.hostVerifications.findById(input.id);
    if (!verification) throw new HostVerificationNotFoundError(input.id);

    const to = input.approve ? 'APPROVED' : 'REJECTED';
    if (!canTransitionHostVerificationStatus(verification.status, to)) {
      throw new InvalidHostVerificationTransitionError(verification.status, to);
    }

    return this.hostVerifications.review(input.id, {
      status: to,
      reviewedByUserId: input.reviewerUserId,
      rejectionReason: input.approve ? null : (input.rejectionReason ?? null),
    });
  }
}
