import type {
  AddressValue,
  CoordinatesValue,
  DataField,
  DateRangeValue,
  Field,
  FileRef,
  GroupField,
  KeyValueEntry,
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
    case 'tags':
    case 'array':
    case 'cascader':
    case 'keyValue':
      return [];
    case 'checkbox':
    case 'toggle':
    case 'consent':
      return false;
    // Numéricos: vacío (null) en vez de 0 para no forzar un valor engañoso.
    case 'number':
    case 'currency':
    case 'percentage':
    case 'range':
    case 'rating':
    case 'year':
      return null;
    // Objetos / referencias sin valor inicial.
    case 'hidden':
    case 'json':
    case 'file':
    case 'image':
    case 'avatar':
    case 'signature':
    case 'coordinates':
      return null;
    case 'dateRange':
    case 'dateRangeTime':
      return { from: null, to: null };
    case 'address':
      return {};
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
type FieldValue<F> = F extends {
  type: 'number' | 'currency' | 'percentage' | 'range' | 'rating' | 'year';
}
  ? number | null
  : F extends { type: 'checkbox' | 'toggle' | 'consent' }
    ? boolean
    : F extends { type: 'multiselect' | 'tags' | 'cascader' }
      ? string[]
      : F extends { type: 'keyValue' }
        ? KeyValueEntry[]
        : F extends { type: 'array' }
          ? Record<string, JsonValue>[]
          : F extends { type: 'dateRange' | 'dateRangeTime' }
            ? DateRangeValue
            : F extends { type: 'coordinates' }
              ? CoordinatesValue | null
              : F extends { type: 'address' }
                ? AddressValue
                : F extends { type: 'avatar' | 'signature' }
                  ? FileRef | null
                  : F extends { type: 'file' | 'image' }
                    ? FileRef | FileRef[] | null
                    : F extends { type: 'treeSelect' }
                      ? string | string[]
                      : F extends { type: 'hidden' | 'json' }
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
