import { validateTemplate } from '../template/validate-template';
import type { FieldDescriptor } from './field-descriptor';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valida un objeto de datos contra una lista de descriptores. Devuelve un
// string con la razón del primer error, o null si es válido. Rechaza keys no
// declaradas para mantener el contrato estricto.
//
// `allowTemplates`: cuando true (contenido de un tipo de mensaje, que puede
// llevar `{{ var }}`), se comprueba presencia de requeridos pero NO el formato
// concreto (email/number), porque el valor real se resuelve en el envío.
export function validateFields(
  fields: FieldDescriptor[],
  data: unknown,
  allowTemplates = false,
): string | null {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return 'los datos deben ser un objeto';
  }
  const obj = data as Record<string, unknown>;
  const known = new Set(fields.map((f) => f.key));

  for (const key of Object.keys(obj)) {
    if (!known.has(key)) return `campo no reconocido: "${key}"`;
  }

  for (const field of fields) {
    const value = obj[field.key];
    const empty = value === undefined || value === null || value === '';

    if (field.required && empty) {
      return `falta el campo requerido "${field.key}"`;
    }
    if (empty) continue;

    if (allowTemplates && typeof value === 'string') {
      // Con plantillas solo garantizamos que sea string; el formato se valida
      // tras renderizar en el envío.
      continue;
    }

    switch (field.type) {
      case 'text':
      case 'textarea':
        if (typeof value !== 'string') return `"${field.key}" debe ser texto`;
        break;
      case 'email':
        if (typeof value !== 'string' || !EMAIL_RE.test(value)) {
          return `"${field.key}" debe ser un email válido`;
        }
        break;
      case 'number':
        if (typeof value !== 'number')
          return `"${field.key}" debe ser un número`;
        break;
      case 'boolean':
        if (typeof value !== 'boolean')
          return `"${field.key}" debe ser booleano`;
        break;
      case 'select':
        if (
          typeof value !== 'string' ||
          !(field.options ?? []).includes(value)
        ) {
          return `"${field.key}" debe ser una de: ${(field.options ?? []).join(', ')}`;
        }
        break;
      case 'template': {
        // La estructura se valida igual con o sin plantillas: las props de
        // texto pueden llevar `{{ var }}` (son strings) y se resuelven al enviar.
        const templateError = validateTemplate(value);
        if (templateError) return `"${field.key}": ${templateError}`;
        break;
      }
    }
  }

  return null;
}
