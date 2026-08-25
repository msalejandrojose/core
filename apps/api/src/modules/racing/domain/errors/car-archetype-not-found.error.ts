import { DomainError } from '../../../../shared/errors/domain-error';

export class CarArchetypeNotFoundError extends DomainError {
  constructor(id: string) {
    super(
      'RACING_CAR_ARCHETYPE_NOT_FOUND',
      `Arquetipo de coche ${id} no encontrado.`,
      { id },
    );
  }
}
