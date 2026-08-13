import { DomainError } from '../../../../shared/errors/domain-error';

export class TrackSlugAlreadyExistsError extends DomainError {
  constructor(slug: string) {
    super(
      'RACING_TRACK_SLUG_ALREADY_EXISTS',
      `Ya existe un circuito con el slug "${slug}".`,
      { slug },
    );
  }
}
