import { collectDataFields } from '../helpers/walk.ts';
import type { FormSchema } from '../types/form.ts';
import type { I18nKey } from '../types/json.ts';

/** Una validación `async` declarada por un campo, con su campo de origen. */
export interface AsyncValidationRef {
  /** `name` del campo que la declara. */
  field: string;
  /** `ref` a resolver contra el backend (`POST /forms/validate/:ref`). */
  ref: string;
  /** Mensaje declarado en el schema (tiene prioridad sobre el del backend). */
  message?: I18nKey;
}

/**
 * Recolecta todas las validaciones `{ kind: 'async', ref }` de un schema, con el
 * campo que las declara. El validador puro las ignora; un resolver de UI usa
 * esta lista para llamar al endpoint de validación async campo a campo.
 */
export function collectAsyncValidations(schema: FormSchema): AsyncValidationRef[] {
  const out: AsyncValidationRef[] = [];
  for (const field of collectDataFields(schema.fields)) {
    for (const validation of field.validations ?? []) {
      if (validation.kind === 'async') {
        out.push({
          field: field.name,
          ref: validation.ref,
          message: validation.message,
        });
      }
    }
  }
  return out;
}
