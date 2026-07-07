import { DomainError } from '../../../../shared/errors/domain-error';

/** El `value` pedido no existe en el repositorio de opciones de `entity`. */
export class FieldOptionNotFoundError extends DomainError {
  constructor(entity: string, value: string) {
    super(
      'FIELD_OPTION_NOT_FOUND',
      `No se encontró la opción "${value}" en la entidad "${entity}".`,
      { entity, value },
    );
  }
}
