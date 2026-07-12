import { DomainError } from '../../../../shared/errors/domain-error';

export class SiteEntryAlreadyRatedError extends DomainError {
  constructor(siteId: string) {
    super(
      'ANDANZAS_SITE_ENTRY_ALREADY_RATED',
      `El sitio "${siteId}" ya tiene una nota — no se puede volver a puntuar en el MVP.`,
      { siteId },
    );
  }
}
