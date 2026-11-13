import { DomainError } from '../../../../shared/errors/domain-error';

export class BrioActivityTypeNotFoundError extends DomainError {
  constructor(id: string) {
    super(
      'BRIO_ACTIVITY_TYPE_NOT_FOUND',
      `Tipo de actividad ${id} no encontrado.`,
      {
        id,
      },
    );
  }
}
