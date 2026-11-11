import { DomainError } from '../../../../shared/errors/domain-error';

export class NutreActivityTypeNotFoundError extends DomainError {
  constructor(id: string) {
    super('NUTRE_ACTIVITY_TYPE_NOT_FOUND', `Tipo de actividad ${id} no encontrado.`, {
      id,
    });
  }
}
