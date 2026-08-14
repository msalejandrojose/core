import { DomainError } from '../../../../shared/errors/domain-error';

export class GrandPrixSlugAlreadyExistsError extends DomainError {
  constructor(slug: string) {
    super(
      'RACING_GRAND_PRIX_SLUG_ALREADY_EXISTS',
      `Ya existe un Grand Prix con el slug "${slug}".`,
      { slug },
    );
  }
}
