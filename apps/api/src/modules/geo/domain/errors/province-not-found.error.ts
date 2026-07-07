import { DomainError } from '../../../../shared/errors/domain-error';

export class ProvinceNotFoundError extends DomainError {
  constructor(id: string) {
    super('PROVINCE_NOT_FOUND', `Provincia "${id}" no encontrada.`, { id });
  }
}
