// Tipos mínimos soportados en v1 del módulo de formularios dinámicos.
const VALID_FIELD_TYPES = new Set([
  'text', 'textarea', 'email', 'number', 'select',
  'multiselect', 'checkbox', 'radio', 'date', 'hidden',
]);

// Valida la estructura básica del schema JSON de un formulario.
// Devuelve un string con la razón del error, o null si es válido.
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
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (typeof field !== 'object' || field === null) {
      return `fields[${i}] debe ser un objeto`;
    }
    const f = field as Record<string, unknown>;
    if (typeof f['key'] !== 'string' || f['key'].trim() === '') {
      return `fields[${i}].key debe ser un string no vacío`;
    }
    if (typeof f['type'] !== 'string') {
      return `fields[${i}].type debe ser un string`;
    }
    if (!VALID_FIELD_TYPES.has(f['type'] as string)) {
      return `fields[${i}].type "${f['type']}" no es un tipo soportado`;
    }
  }

  // Verificar unicidad de keys
  const keys = (fields as Record<string, unknown>[]).map((f) => f['key'] as string);
  const uniqueKeys = new Set(keys);
  if (uniqueKeys.size !== keys.length) {
    return 'los keys de los campos deben ser únicos';
  }

  return null;
}
