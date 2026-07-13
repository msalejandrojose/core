import { Inject, Injectable } from '@nestjs/common';
import {
  STORED_FILE_REPOSITORY,
  type StoredFileRepositoryPort,
} from '../../../storage/application/ports/stored-file-repository.port';
import { HostVerification } from '../../domain/entities/host-verification.entity';
import { HostVerificationDocumentInvalidError } from '../../domain/errors/host-verification-document-invalid.error';
import {
  HOST_VERIFICATION_REPOSITORY,
  type HostVerificationRepositoryPort,
} from '../ports/host-verification-repository.port';

export interface SubmitHostVerificationInput {
  hostUserId: string;
  legalName: string;
  documentFileId: string;
}

/**
 * Envía (o reenvía tras un rechazo) la verificación de identidad del host:
 * nombre legal + documento ya subido vía `storage`. Reenviar reemplaza la
 * solicitud anterior y vuelve a `PENDING` — un host tiene como mucho una
 * solicitud viva.
 */
@Injectable()
export class SubmitHostVerificationUseCase {
  constructor(
    @Inject(HOST_VERIFICATION_REPOSITORY)
    private readonly hostVerifications: HostVerificationRepositoryPort,
    @Inject(STORED_FILE_REPOSITORY)
    private readonly storedFiles: StoredFileRepositoryPort,
  ) {}

  async execute(input: SubmitHostVerificationInput): Promise<HostVerification> {
    const file = await this.storedFiles.findById(input.documentFileId);
    if (
      !file ||
      file.status !== 'READY' ||
      file.ownerUserId !== input.hostUserId
    ) {
      throw new HostVerificationDocumentInvalidError(input.documentFileId);
    }

    return this.hostVerifications.upsert({
      hostUserId: input.hostUserId,
      legalName: input.legalName,
      documentFileId: input.documentFileId,
    });
  }
}
