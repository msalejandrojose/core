/**
 * Puerto de "validador asíncrono" para las validaciones `{ kind: 'async', ref }`
 * de `@core/forms`. El validador puro del package no puede resolverlas (requieren
 * I/O: consultar la BBDD, un servicio externo…), así que el cliente las comprueba
 * llamando a `POST /forms/validate/:ref` mientras el usuario rellena el campo.
 *
 * Cada `ref` la implementa un adapter registrado con el token multi
 * `ASYNC_VALIDATORS`, recogido por `AsyncValidatorRegistry`.
 */

export interface AsyncValidationResult {
  valid: boolean;
  /** Mensaje a mostrar cuando `valid === false`. */
  message?: string;
}

export interface AsyncValidator {
  /** Referencia pública (el `:ref` de la ruta y el `validation.ref`). */
  readonly ref: string;
  validate(
    value: unknown,
    context?: Record<string, unknown>,
  ): Promise<AsyncValidationResult>;
}

/** Token multi-provider: cada validador async concreto se registra aquí. */
export const ASYNC_VALIDATORS = Symbol('ASYNC_VALIDATORS');
