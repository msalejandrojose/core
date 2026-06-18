import { DomainError } from '../../../../shared/errors/domain-error';

export class PostNotFoundError extends DomainError {
  constructor(idOrSlug: string) {
    super('POST_NOT_FOUND', `Post "${idOrSlug}" no encontrado.`, { idOrSlug });
  }
}
