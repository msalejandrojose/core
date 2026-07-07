import { DomainError } from '../../../../shared/errors/domain-error';

export class MunicipalityNotFoundError extends DomainError {
  constructor(id: string) {
    super('MUNICIPALITY_NOT_FOUND', `Municipio "${id}" no encontrado.`, { id });
  }
}
