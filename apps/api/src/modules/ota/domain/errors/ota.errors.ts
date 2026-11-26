import { DomainError } from '../../../../shared/errors/domain-error';

export class InvalidOtaBundleError extends DomainError {
  constructor(reason: string) {
    super('OTA_BUNDLE_INVALID', `La actualización no es válida: ${reason}`, {
      reason,
    });
  }
}

export class DuplicatedOtaBundleError extends DomainError {
  constructor(appId: string, version: string) {
    super(
      'OTA_BUNDLE_DUPLICATED',
      `Ya existe la versión ${version} de ${appId}.`,
      { appId, version },
    );
  }
}

export class OtaBundleNotFoundError extends DomainError {
  constructor(id: string) {
    super('OTA_BUNDLE_NOT_FOUND', `No existe la actualización ${id}.`, { id });
  }
}
