import { DomainError } from '../../../../shared/errors/domain-error';

export class RegionNotFoundError extends DomainError {
  constructor(id: string) {
    super('REGION_NOT_FOUND', `Comunidad autónoma "${id}" no encontrada.`, {
      id,
    });
  }
}
