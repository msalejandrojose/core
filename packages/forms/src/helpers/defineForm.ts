import type {
  DataField,
  Field,
  GroupField,
} from '../types/field.ts';
import type { FormSchema, FormValues } from '../types/form.ts';
import type { JsonValue } from '../types/json.ts';
import { collectDataFields } from './walk.ts';

/**
 * Identidad tipada: preserva los tipos literales del schema (gracias a `const`)
 * para que `InferFormValues` pueda inferir el modelo de valores. No transforma
 * nada en runtime; solo da forma y autocompletado.
 */
export function defineForm<const S extends FormSchema>(schema: S): S {
  return schema;
}

/** Valor por defecto sensato para un campo cuando no declara `defaultValue`. */
function fallbackDefault(field: DataField): JsonValue {
  switch (field.type) {
    case 'multiselect':
      return [];
    case 'checkbox':
    case 'toggle':
      return false;
    case 'number':
      // Vacío en vez de 0 para no forzar un valor inicial engañoso.
      return null;
    case 'hidden':
      return null;
    default:
      return '';
  }
}

/**
 * Construye el objeto de valores iniciales del formulario a partir de los
 * `defaultValue` de cada campo (y un fallback por tipo). Útil como
 * `defaultValues` de react-hook-form u otro form state.
 */
export function getDefaultValues(schema: FormSchema): FormValues {
  const values: FormValues = {};
  for (const field of collectDataFields(schema.fields)) {
    values[field.name] =
      field.defaultValue !== undefined
        ? field.defaultValue
        : fallbackDefault(field);
  }
  return values;
}

// --- Inferencia de tipos ----------------------------------------------------

/** Valor TS asociado a un campo de datos según su `type`. */
type FieldValue<F> = F extends { type: 'number' }
  ? number | null
  : F extends { type: 'checkbox' | 'toggle' }
    ? boolean
    : F extends { type: 'multiselect' }
      ? string[]
      : F extends { type: 'hidden' }
        ? JsonValue
        : string;

/**
 * Aplana la unión de campos entrando un nivel en los grupos (que no anidan
 * valor). La inferencia es deliberadamente de un solo nivel para evitar
 * recursión de tipos profunda; en runtime sí se soportan grupos anidados.
 */
type FlattenData<T> = T extends readonly (infer E)[]
  ? E extends GroupField
    ? Extract<E['fields'][number], { name: string }>
    : E extends { name: string }
      ? E
      : never
  : never;

/**
 * Infiere el modelo de valores (`{ [name]: valor }`) a partir de un schema
 * definido con `defineForm`. Los grupos (un nivel) se aplanan; los helpers de
 * UI (heading/divider) se ignoran.
 */
export type InferFormValues<S extends FormSchema> = {
  [F in FlattenData<S['fields']> as F extends { name: infer N extends string }
    ? N
    : never]: FieldValue<F>;
};

// Re-export para conveniencia desde el helper.
export type { Field, FormSchema };
