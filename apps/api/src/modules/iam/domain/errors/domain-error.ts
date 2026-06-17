/**
 * Error base para todo el dominio. Cualquier excepción que represente una
 * violación de reglas de negocio extiende de esta clase. El filter global
 * `DomainErrorFilter` mapea `code` a un `HttpStatus` y serializa la
 * respuesta como `{ statusCode, code, message }`.
 */
export abstract class DomainError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = new.target.name;
  }
}
