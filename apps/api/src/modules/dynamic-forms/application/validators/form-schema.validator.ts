import {
  FIELD_TYPES,
  isChoiceType,
  isFieldType,
  isTextType,
} from './field-spec';

// Valida la estructura completa del schema JSON de un formulario (la forma
// persistida de los `fields`). Devuelve un string con la razón del primer
// error encontrado, o `null` si el schema es válido.
//
// Va más allá de comprobar `key`/`type`: valida cada propiedad del campo según
// su tipo (opciones de los selects, coherencia de min/max, regex compilable,
// longitudes no negativas, etc.) para que un schema inválido nunca llegue a
// persistirse ni a servirse a la web pública.
export function validateFormSchema(schema: unknown): string | null {
  if (typeof schema !== 'object' || schema === null || Array.isArray(schema)) {
    return 'el schema debe ser un objeto';
  }

  const s = schema as Record<string, unknown>;

  if (typeof s['version'] !== 'number') {
    return 'falta el campo "version" (number)';
  }

  if (!Array.isArray(s['fields'])) {
    return 'falta el campo "fields" (array)';
  }

  const fields = s['fields'] as unknown[];
  const keys: string[] = [];

  for (let i = 0; i < fields.length; i++) {
    const error = validateField(fields[i], i);
    if (error) return error;
    keys.push((fields[i] as Record<string, unknown>)['key'] as string);
  }

  // Unicidad de keys.
  if (new Set(keys).size !== keys.length) {
    return 'los keys de los campos deben ser únicos';
  }

  return null;
}

function validateField(field: unknown, i: number): string | null {
  if (typeof field !== 'object' || field === null || Array.isArray(field)) {
    return `fields[${i}] debe ser un objeto`;
  }
  const f = field as Record<string, unknown>;

  // key
  if (typeof f['key'] !== 'string' || f['key'].trim() === '') {
    return `fields[${i}].key debe ser un string no vacío`;
  }
  if (/\s/.test(f['key'])) {
    return `fields[${i}].key no puede contener espacios`;
  }

  // type
  if (!isFieldType(f['type'])) {
    return `fields[${i}].type "${String(f['type'])}" no es un tipo soportado (permitidos: ${FIELD_TYPES.join(', ')})`;
  }
  const type = f['type'];

  // Metadatos de texto opcionales.
  for (const prop of ['label', 'placeholder', 'helpText', 'pattern'] as const) {
    if (f[prop] !== undefined && typeof f[prop] !== 'string') {
      return `fields[${i}].${prop} debe ser un string`;
    }
  }
  if (f['required'] !== undefined && typeof f['required'] !== 'boolean') {
    return `fields[${i}].required debe ser un boolean`;
  }

  // Opciones (select / multiselect / radio).
  if (isChoiceType(type)) {
    const optError = validateOptions(f['options'], i);
    if (optError) return optError;
  }

  // Constraints textuales.
  if (isTextType(type)) {
    const minLen = f['minLength'];
    const maxLen = f['maxLength'];
    if (minLen !== undefined && !isNonNegativeInt(minLen)) {
      return `fields[${i}].minLength debe ser un entero ≥ 0`;
    }
    if (maxLen !== undefined && !isNonNegativeInt(maxLen)) {
      return `fields[${i}].maxLength debe ser un entero ≥ 0`;
    }
    if (
      typeof minLen === 'number' &&
      typeof maxLen === 'number' &&
      minLen > maxLen
    ) {
      return `fields[${i}].minLength no puede ser mayor que maxLength`;
    }
    if (typeof f['pattern'] === 'string' && f['pattern'].trim() !== '') {
      try {
        new RegExp(f['pattern']);
      } catch {
        return `fields[${i}].pattern no es una expresión regular válida`;
      }
    }
  }

  // Constraints numéricos.
  if (type === 'number') {
    const min = f['min'];
    const max = f['max'];
    const step = f['step'];
    if (min !== undefined && typeof min !== 'number') {
      return `fields[${i}].min debe ser un número`;
    }
    if (max !== undefined && typeof max !== 'number') {
      return `fields[${i}].max debe ser un número`;
    }
    if (typeof min === 'number' && typeof max === 'number' && min > max) {
      return `fields[${i}].min no puede ser mayor que max`;
    }
    if (step !== undefined && (typeof step !== 'number' || step <= 0)) {
      return `fields[${i}].step debe ser un número > 0`;
    }
  }

  // Filas del textarea.
  if (type === 'textarea' && f['rows'] !== undefined) {
    if (!isPositiveInt(f['rows'])) {
      return `fields[${i}].rows debe ser un entero ≥ 1`;
    }
  }

  return null;
}

function validateOptions(options: unknown, i: number): string | null {
  if (!Array.isArray(options) || options.length === 0) {
    return `fields[${i}].options debe ser un array con al menos una opción`;
  }
  const opts = options as unknown[];
  const values: string[] = [];
  for (let j = 0; j < opts.length; j++) {
    const opt = opts[j];
    if (typeof opt !== 'object' || opt === null || Array.isArray(opt)) {
      return `fields[${i}].options[${j}] debe ser un objeto`;
    }
    const o = opt as Record<string, unknown>;
    if (typeof o['value'] !== 'string' || o['value'].trim() === '') {
      return `fields[${i}].options[${j}].value debe ser un string no vacío`;
    }
    if (typeof o['label'] !== 'string' || o['label'].trim() === '') {
      return `fields[${i}].options[${j}].label debe ser un string no vacío`;
    }
    values.push(o['value']);
  }
  if (new Set(values).size !== values.length) {
    return `fields[${i}].options tiene values duplicados`;
  }
  return null;
}

function isNonNegativeInt(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isPositiveInt(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}
