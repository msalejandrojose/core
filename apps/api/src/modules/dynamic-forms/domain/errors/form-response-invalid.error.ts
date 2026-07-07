import { DomainError } from '../../../../shared/errors/domain-error';

/**
 * Las respuestas enviadas no cumplen el schema del formulario (campos
 * obligatorios vacíos, formato inválido, opción inexistente…). El detalle por
 * campo viaja en `context.fields` para logging; el mensaje resume los campos
 * afectados de cara al cliente.
 */
export class FormResponseInvalidError extends DomainError {
  constructor(fields: Record<string, string>) {
    const keys = Object.keys(fields);
    const summary = keys.map((key) => `${key} (${fields[key]})`).join('; ');
    super(
      'FORM_RESPONSE_INVALID',
      `Las respuestas del formulario no son válidas: ${summary}`,
      { fields },
    );
  }
}
