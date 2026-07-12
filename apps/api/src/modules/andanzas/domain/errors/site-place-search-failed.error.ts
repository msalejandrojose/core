import { DomainError } from '../../../../shared/errors/domain-error';

export class SitePlaceSearchFailedError extends DomainError {
  constructor(reason: string) {
    super(
      'ANDANZAS_SITE_PLACE_SEARCH_FAILED',
      'No se ha podido buscar sitios en el proveedor externo.',
      { reason },
    );
  }
}
