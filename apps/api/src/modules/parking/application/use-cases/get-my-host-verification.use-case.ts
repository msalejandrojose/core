import { Inject, Injectable } from '@nestjs/common';
import { HostVerification } from '../../domain/entities/host-verification.entity';
import {
  HOST_VERIFICATION_REPOSITORY,
  type HostVerificationRepositoryPort,
} from '../ports/host-verification-repository.port';

/** `null` si el host todavía no ha enviado ninguna solicitud (no es un error). */
@Injectable()
export class GetMyHostVerificationUseCase {
  constructor(
    @Inject(HOST_VERIFICATION_REPOSITORY)
    private readonly hostVerifications: HostVerificationRepositoryPort,
  ) {}

  execute(hostUserId: string): Promise<HostVerification | null> {
    return this.hostVerifications.findByHostUserId(hostUserId);
  }
}
