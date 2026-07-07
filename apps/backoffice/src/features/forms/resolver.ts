import {
  collectAsyncValidations,
  validateForm,
  type FormSchema,
  type ValidateOptions,
} from '@core/forms';
import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';
import { validateAsync, type AsyncValidateResult } from './async-validate';

type FieldError = { type: string; message: string };

/** Resolutor de las validaciones `async` (por defecto, el endpoint del backend). */
export type AsyncResolver = (
  ref: string,
  value: unknown,
) => Promise<AsyncValidateResult>;

export interface CoreFormsResolverOptions extends ValidateOptions {
  /** Override del resolutor async (útil en tests). Por defecto llama a la API. */
  asyncValidate?: AsyncResolver;
}

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Adapta el evaluador `validateForm` de `@core/forms` al contrato de resolver de
 * react-hook-form. Corre la validación declarativa síncrona y, además, resuelve
 * las validaciones `{ kind: 'async', ref }` contra el backend
 * (`POST /forms/validate/:ref`), fusionando ambos conjuntos de errores.
 *
 * Las async solo se comprueban para campos que ya pasan la validación síncrona
 * y tienen valor no vacío (evita disparar el endpoint con datos incompletos).
 */
export function coreFormsResolver<T extends FieldValues>(
  schema: FormSchema,
  options?: CoreFormsResolverOptions,
): Resolver<T> {
  const asyncRefs = collectAsyncValidations(schema);
  const runAsync = options?.asyncValidate ?? validateAsync;

  return async (values) => {
    const record = values as Record<string, unknown>;
    const result = validateForm(schema, record, options);

    const errors: Record<string, FieldError> = {};
    for (const [name, messages] of Object.entries(result.errors)) {
      errors[name] = { type: 'validate', message: messages[0] };
    }

    if (asyncRefs.length > 0) {
      await Promise.all(
        asyncRefs.map(async ({ field, ref, message }) => {
          // No molestamos al backend si el campo ya falla o está vacío.
          if (errors[field] || isEmpty(record[field])) return;
          const res = await runAsync(ref, record[field]);
          if (!res.valid) {
            errors[field] = {
              type: 'async',
              message: message ?? res.message ?? 'Valor no válido',
            };
          }
        }),
      );
    }

    if (Object.keys(errors).length === 0) {
      return { values, errors: {} };
    }
    return { values: {}, errors: errors as FieldErrors<T> };
  };
}
