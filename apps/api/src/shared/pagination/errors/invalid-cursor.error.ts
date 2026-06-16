import { DomainError } from '../../../modules/iam/domain/errors/domain-error';

/**
 * Se lanza cuando el cliente envía un `cursor` que no es base64url válido,
 * que no decodifica a JSON, o al que le faltan campos requeridos.
 * El `DomainErrorFilter` la mapea a `400 Bad Request` con
 * `code: "INVALID_CURSOR"`.
 */
export class InvalidCursorError extends DomainError {
  constructor() {
    super('INVALID_CURSOR', 'El cursor de paginación es inválido.');
  }
}
