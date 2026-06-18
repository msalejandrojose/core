import { DomainError } from '../../../../shared/errors/domain-error';

export class SlugAlreadyExistsError extends DomainError {
  constructor(slug: string) {
    super(
      'SLUG_ALREADY_EXISTS',
      `Ya existe un elemento con el slug "${slug}".`,
      {
        slug,
      },
    );
  }
}
