import { DomainError } from '../../../../shared/errors/domain-error';

/** No hay repositorio de opciones registrado para el `entity` pedido. */
export class FieldOptionsEntityNotFoundError extends DomainError {
  constructor(entity: string) {
    super(
      'FIELD_OPTIONS_ENTITY_NOT_FOUND',
      `No existe un repositorio de opciones para la entidad "${entity}".`,
      { entity },
    );
  }
}
