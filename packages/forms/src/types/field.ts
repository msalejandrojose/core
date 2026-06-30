import type { Condition } from './condition.ts';
import type { I18nKey, JsonValue } from './json.ts';
import type { Validation } from './validation.ts';

/** Opción de un campo de selección (`select` / `multiselect`). */
export interface SelectOption {
  value: string;
  label: I18nKey;
  disabled?: boolean;
}

/**
 * Metadatos comunes a todos los campos. Las labels son `I18nKey`: el package
 * solo declara la clave, el renderer la resuelve con su provider de i18n.
 */
export interface FieldMeta {
  label?: I18nKey;
  placeholder?: I18nKey;
  helpText?: I18nKey;
  required?: boolean;
  readOnly?: boolean;
  hidden?: boolean;
  validations?: Validation[];
  visibleWhen?: Condition;
  enabledWhen?: Condition;
  testId?: string;
}

/** Base de los campos que producen un valor (tienen `name`). */
export interface DataFieldBase extends FieldMeta {
  name: string;
}

// --- Texto y contenido ------------------------------------------------------

export interface TextField extends DataFieldBase {
  type: 'text';
  defaultValue?: string;
}

export interface TextareaField extends DataFieldBase {
  type: 'textarea';
  defaultValue?: string;
  rows?: number;
}

export interface EmailField extends DataFieldBase {
  type: 'email';
  defaultValue?: string;
}

export interface PasswordField extends DataFieldBase {
  type: 'password';
  defaultValue?: string;
}

// --- Numérico ---------------------------------------------------------------

export interface NumberField extends DataFieldBase {
  type: 'number';
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
}

// --- Selección --------------------------------------------------------------

export interface SelectField extends DataFieldBase {
  type: 'select';
  options: SelectOption[];
  defaultValue?: string;
}

export interface MultiselectField extends DataFieldBase {
  type: 'multiselect';
  options: SelectOption[];
  defaultValue?: string[];
}

export interface CheckboxField extends DataFieldBase {
  type: 'checkbox';
  defaultValue?: boolean;
}

export interface ToggleField extends DataFieldBase {
  type: 'toggle';
  defaultValue?: boolean;
}

// --- Fecha ------------------------------------------------------------------

export interface DateField extends DataFieldBase {
  type: 'date';
  /** ISO-8601 (`YYYY-MM-DD`). */
  defaultValue?: string;
}

// --- Estructurales ----------------------------------------------------------

export interface HiddenField extends DataFieldBase {
  type: 'hidden';
  defaultValue?: JsonValue;
}

/**
 * Agrupador puramente presentacional. Sus hijos siguen siendo campos de
 * primer nivel (sus valores NO se anidan bajo el grupo), de modo que un grupo
 * solo afecta al layout y a la visibilidad en bloque.
 */
export interface GroupField extends FieldMeta {
  type: 'group';
  fields: readonly Field[];
  /** Nº de columnas en las que distribuir los hijos (el renderer decide). */
  columns?: number;
}

// --- UI helpers (sin valor) -------------------------------------------------

export interface HeadingField {
  type: 'heading';
  text: I18nKey;
  level?: 1 | 2 | 3;
  visibleWhen?: Condition;
  testId?: string;
}

export interface DividerField {
  type: 'divider';
  visibleWhen?: Condition;
  testId?: string;
}

/** Campos que producen un valor en el modelo del formulario. */
export type DataField =
  | TextField
  | TextareaField
  | EmailField
  | PasswordField
  | NumberField
  | SelectField
  | MultiselectField
  | CheckboxField
  | ToggleField
  | DateField
  | HiddenField;

/**
 * Unión discriminada de todos los campos. Es **forward-compatible**: los
 * renderers deben ignorar tipos que no conozcan en vez de romper, por lo que
 * añadir un tipo nuevo aquí no es un breaking change para renderers antiguos.
 */
export type Field = DataField | GroupField | HeadingField | DividerField;

export type FieldType = Field['type'];
