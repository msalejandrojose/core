import {
  validateForm,
  type FormSchema,
  type ValidateOptions,
} from '@core/forms';
import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';

/**
 * Adapta el evaluador puro `validateForm` de `@core/forms` al contrato de
 * resolver de react-hook-form. Así la misma validación declarativa que se puede
 * ejecutar en el backend dirige también la UX del formulario.
 */
export function coreFormsResolver<T extends FieldValues>(
  schema: FormSchema,
  options?: ValidateOptions,
): Resolver<T> {
  return (values) => {
    const result = validateForm(
      schema,
      values as Record<string, unknown>,
      options,
    );

    if (result.valid) {
      return { values, errors: {} };
    }

    const errors: Record<string, { type: string; message: string }> = {};
    for (const [name, messages] of Object.entries(result.errors)) {
      errors[name] = { type: 'validate', message: messages[0] };
    }

    return { values: {}, errors: errors as FieldErrors<T> };
  };
}
