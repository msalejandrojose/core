import { DomainError } from '../../../../shared/errors/domain-error';

/** El `documentFileId` no existe, no pertenece al host, o no está `READY`. */
export class HostVerificationDocumentInvalidError extends DomainError {
  constructor(documentFileId: string) {
    super(
      'HOST_VERIFICATION_DOCUMENT_INVALID',
      `El archivo ${documentFileId} no está disponible para usarse como documento de verificación.`,
      { documentFileId },
    );
  }
}
