import { DomainError } from '../../../../shared/errors/domain-error';

export class SiteNotFoundError extends DomainError {
  constructor(id: string) {
    super('ANDANZAS_SITE_NOT_FOUND', `Sitio "${id}" no encontrado.`, { id });
  }
}
