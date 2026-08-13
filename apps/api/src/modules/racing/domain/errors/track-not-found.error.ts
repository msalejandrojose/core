import { DomainError } from '../../../../shared/errors/domain-error';

export class TrackNotFoundError extends DomainError {
  constructor(slug: string) {
    super('RACING_TRACK_NOT_FOUND', `Circuito ${slug} no encontrado.`, { slug });
  }
}
