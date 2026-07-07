/**
 * Contrato canónico de los campos (`fields`) del schema persistido de un
 * formulario dinámico. Es el equivalente, del lado de la API, al tipo
 * `FormFieldSchema` que `@core/forms` (`persisted/types.ts`) comparte con el
 * backoffice y la web.
 *
 * ¿Por qué duplicarlo aquí en vez de importar `@core/forms`? Ese package es
 * ESM puro con imports `.ts` sin build; la API se compila a CJS con Nest y no
 * puede consumir su código fuente sin romper el bundle. El schema persistido
 * ES el contrato de la API, así que declararlo aquí es legítimo: esta capa es
 * la fuente de verdad para *validar* lo que entra por HTTP. Ambos lados deben
 * mantenerse en sync (mismo set de tipos, mismas propiedades).
 */

/** Tipos de campo soportados por la v1 del schema persistido. */
export const FIELD_TYPES = [
  'text',
  'textarea',
  'email',
  'number',
  'select',
  'multiselect',
  'checkbox',
  'radio',
  'date',
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

const FIELD_TYPE_SET: ReadonlySet<string> = new Set(FIELD_TYPES);

/** Tipos que llevan lista de opciones (`options`). */
export const CHOICE_TYPES: ReadonlySet<FieldType> = new Set([
  'select',
  'multiselect',
  'radio',
]);

/** Tipos textuales que admiten `minLength` / `maxLength` / `pattern`. */
export const TEXT_TYPES: ReadonlySet<FieldType> = new Set([
  'text',
  'textarea',
  'email',
]);

export function isFieldType(value: unknown): value is FieldType {
  return typeof value === 'string' && FIELD_TYPE_SET.has(value);
}

export function isChoiceType(type: FieldType): boolean {
  return CHOICE_TYPES.has(type);
}

export function isTextType(type: FieldType): boolean {
  return TEXT_TYPES.has(type);
}

/** Opción (value/label) de un campo de selección. */
export interface PersistedFieldOption {
  value: string;
  label: string;
}

/**
 * Forma persistida de un campo. Espejo de `@core/forms` `FormFieldSchema`.
 * Todas las propiedades más allá de `key`/`type` son opcionales y aplican solo
 * a ciertos tipos (ver `validateFormSchema`).
 */
export interface PersistedFieldSchema {
  key: string;
  type: FieldType;
  label?: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  /** select / multiselect / radio */
  options?: PersistedFieldOption[];
  /** text / textarea / email */
  minLength?: number;
  maxLength?: number;
  /** number */
  min?: number;
  max?: number;
  step?: number;
  /** text / textarea / email — regex sin delimitadores */
  pattern?: string;
  /** textarea */
  rows?: number;
}

export interface PersistedFormSchema {
  version: number;
  fields: PersistedFieldSchema[];
}
