import { DomainError } from '../../../../shared/errors/domain-error';

export class FormInstanceNotFoundError extends DomainError {
  constructor(idOrHash: string) {
    super('FORM_INSTANCE_NOT_FOUND', `Instancia de formulario ${idOrHash} no encontrada.`, { idOrHash });
  }
}
