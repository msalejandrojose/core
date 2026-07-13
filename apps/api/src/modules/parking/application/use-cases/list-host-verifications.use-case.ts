import { Inject, Injectable } from '@nestjs/common';
import { CursorPage } from '../../../../shared/pagination';
import { HostVerification } from '../../domain/entities/host-verification.entity';
import {
  HOST_VERIFICATION_REPOSITORY,
  type HostVerificationRepositoryPort,
  type ListHostVerificationsOptions,
} from '../ports/host-verification-repository.port';

/** Backoffice: cola de verificaciones de host para revisar. */
@Injectable()
export class ListHostVerificationsUseCase {
  constructor(
    @Inject(HOST_VERIFICATION_REPOSITORY)
    private readonly hostVerifications: HostVerificationRepositoryPort,
  ) {}

  execute(
    opts: ListHostVerificationsOptions,
  ): Promise<CursorPage<HostVerification>> {
    return this.hostVerifications.list(opts);
  }
}
