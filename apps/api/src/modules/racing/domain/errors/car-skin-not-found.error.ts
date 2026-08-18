import { DomainError } from '../../../../shared/errors/domain-error';

export class CarSkinNotFoundError extends DomainError {
  constructor(id: string) {
    super('RACING_CAR_SKIN_NOT_FOUND', `Skin de coche ${id} no encontrado.`, {
      id,
    });
  }
}
