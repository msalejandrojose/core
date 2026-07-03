import type {
  Field,
  FormSchema,
  SelectOption,
  Validation,
} from '@core/forms';
import type {
  FormFieldOption,
  FormFieldSchema,
  FormFieldType,
  FormSchemaJson,
} from './types';

export const SCHEMA_VERSION = 1;

/** Metadatos de UI de cada tipo de campo para el builder. */
export interface FieldTypeMeta {
  type: FormFieldType;
  label: string;
  /** ¿Usa lista de opciones (value/label)? */
  hasOptions: boolean;
}

export const FIELD_TYPES: FieldTypeMeta[] = [
  { type: 'text', label: 'Texto', hasOptions: false },
  { type: 'textarea', label: 'Texto largo', hasOptions: false },
  { type: 'email', label: 'Email', hasOptions: false },
  { type: 'number', label: 'Número', hasOptions: false },
  { type: 'date', label: 'Fecha', hasOptions: false },
  { type: 'select', label: 'Desplegable', hasOptions: true },
  { type: 'multiselect', label: 'Selección múltiple', hasOptions: true },
  { type: 'radio', label: 'Opción única (radio)', hasOptions: true },
  { type: 'checkbox', label: 'Casilla (sí/no)', hasOptions: false },
];

export function fieldTypeLabel(type: FormFieldType): string {
  return FIELD_TYPES.find((t) => t.type === type)?.label ?? type;
}

export function typeHasOptions(type: FormFieldType): boolean {
  return FIELD_TYPES.find((t) => t.type === type)?.hasOptions ?? false;
}

export function emptySchema(): FormSchemaJson {
  return { version: SCHEMA_VERSION, fields: [] };
}

/** Deriva un `key` único (`campo_N`) que no colisione con los existentes. */
export function nextFieldKey(existing: FormFieldSchema[]): string {
  const keys = new Set(existing.map((f) => f.key));
  let i = existing.length + 1;
  let key = `campo_${i}`;
  while (keys.has(key)) {
    i += 1;
    key = `campo_${i}`;
  }
  return key;
}

export function makeField(
  type: FormFieldType,
  existing: FormFieldSchema[],
): FormFieldSchema {
  const key = nextFieldKey(existing);
  const field: FormFieldSchema = {
    key,
    type,
    label: 'Nuevo campo',
    required: false,
  };
  if (typeHasOptions(type)) {
    field.options = [
      { value: 'opcion_1', label: 'Opción 1' },
      { value: 'opcion_2', label: 'Opción 2' },
    ];
  }
  return field;
}

/** ¿Es un `key` válido? (no vacío, sin espacios). */
export function isValidKey(key: string): boolean {
  return key.trim().length > 0 && !/\s/.test(key);
}

/** Claves duplicadas dentro del schema (para señalar errores en el builder). */
export function duplicateKeys(fields: FormFieldSchema[]): Set<string> {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const f of fields) {
    if (seen.has(f.key)) dups.add(f.key);
    seen.add(f.key);
  }
  return dups;
}

// --- Adaptador al schema de `@core/forms` -----------------------------------

function toOptions(options: FormFieldOption[] | undefined): SelectOption[] {
  return (options ?? []).map((o) => ({ value: o.value, label: o.label }));
}

function toValidations(field: FormFieldSchema): Validation[] {
  const validations: Validation[] = [];
  if (field.required) validations.push({ kind: 'required' });
  if (field.type === 'email') validations.push({ kind: 'email' });
  if (typeof field.minLength === 'number')
    validations.push({ kind: 'minLength', value: field.minLength });
  if (typeof field.maxLength === 'number')
    validations.push({ kind: 'maxLength', value: field.maxLength });
  if (typeof field.min === 'number')
    validations.push({ kind: 'min', value: field.min });
  if (typeof field.max === 'number')
    validations.push({ kind: 'max', value: field.max });
  if (field.pattern && field.pattern.trim())
    validations.push({ kind: 'pattern', value: field.pattern });
  return validations;
}

/**
 * Traduce el schema persistido del backoffice al schema declarativo de
 * `@core/forms`, de modo que el mismo `FormRenderer` compartido pinte tanto el
 * preview del builder como (a futuro) el formulario público. Garantiza paridad
 * WYSIWYG sin duplicar lógica de render.
 */
export function apiSchemaToCoreSchema(schema: FormSchemaJson): FormSchema {
  const fields: Field[] = schema.fields.map((f) => {
    const base = {
      name: f.key,
      label: f.label,
      placeholder: f.placeholder,
      helpText: f.helpText,
      required: f.required,
      validations: toValidations(f),
    };
    switch (f.type) {
      case 'textarea':
        return { ...base, type: 'textarea', rows: f.rows };
      case 'number':
        return { ...base, type: 'number', min: f.min, max: f.max, step: f.step };
      case 'select':
        return { ...base, type: 'select', options: toOptions(f.options) };
      case 'multiselect':
        return { ...base, type: 'multiselect', options: toOptions(f.options) };
      case 'radio':
        return { ...base, type: 'radio', options: toOptions(f.options) };
      case 'checkbox':
        return { ...base, type: 'checkbox' };
      case 'email':
        return { ...base, type: 'email' };
      case 'date':
        return { ...base, type: 'date' };
      case 'text':
      default:
        return { ...base, type: 'text' };
    }
  });
  return { fields };
}

/** Formatea el valor de una respuesta para lectura, resolviendo labels de opciones. */
export function formatAnswer(
  field: FormFieldSchema,
  value: unknown,
): string {
  if (value == null || value === '') return '—';

  const optionLabel = (v: unknown): string => {
    const opt = field.options?.find((o) => o.value === v);
    return opt ? opt.label : String(v);
  };

  if (field.type === 'checkbox') return value ? 'Sí' : 'No';

  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return value.map(optionLabel).join(', ');
  }

  if (field.type === 'select' || field.type === 'radio') {
    return optionLabel(value);
  }

  return String(value);
}
