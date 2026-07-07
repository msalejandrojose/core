import {
  isChoiceType,
  type PersistedFieldSchema,
  type PersistedFormSchema,
} from './field-spec';

/**
 * Resultado de validar un conjunto de respuestas contra el schema de un
 * formulario. `errors` mapea `fieldKey → mensaje` (el primer error por campo).
 */
export interface AnswersValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Valida las respuestas enviadas (`answers`) contra la forma persistida del
 * schema. Es la red de seguridad autoritativa del backend: la misma validación
 * declarativa corre en el cliente (`@core/forms`), pero el servidor no puede
 * confiar en ella. Campos desconocidos en `answers` se ignoran
 * (forward-compatible); cada campo del schema se valida según su tipo.
 */
export function validateFormAnswers(
  schema: PersistedFormSchema,
  answers: unknown,
): AnswersValidationResult {
  const errors: Record<string, string> = {};

  if (
    typeof answers !== 'object' ||
    answers === null ||
    Array.isArray(answers)
  ) {
    return {
      valid: false,
      errors: { _root: 'las respuestas deben ser un objeto' },
    };
  }

  const values = answers as Record<string, unknown>;

  for (const field of schema.fields) {
    const error = validateAnswer(field, values[field.key]);
    if (error) errors[field.key] = error;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function validateAnswer(
  field: PersistedFieldSchema,
  value: unknown,
): string | null {
  const type = field.type;

  // --- Requerido -----------------------------------------------------------
  if (field.required) {
    if (type === 'checkbox') {
      if (value !== true) return 'debes marcar esta casilla';
    } else if (isEmpty(value)) {
      return 'este campo es obligatorio';
    }
  }

  // Un campo opcional vacío es válido; no seguimos validando formato.
  if (isEmpty(value)) return null;

  // --- Validación por tipo -------------------------------------------------
  switch (type) {
    case 'text':
    case 'textarea':
    case 'email': {
      if (typeof value !== 'string') return 'debe ser texto';
      if (type === 'email' && !EMAIL_RE.test(value)) {
        return 'el formato de email no es válido';
      }
      if (
        typeof field.minLength === 'number' &&
        value.length < field.minLength
      ) {
        return `debe tener al menos ${field.minLength} caracteres`;
      }
      if (
        typeof field.maxLength === 'number' &&
        value.length > field.maxLength
      ) {
        return `no puede superar los ${field.maxLength} caracteres`;
      }
      if (field.pattern && field.pattern.trim() !== '') {
        let re: RegExp;
        try {
          re = new RegExp(field.pattern);
        } catch {
          // Patrón corrupto en el schema: no bloqueamos por ello (el schema ya
          // debería haberse rechazado al guardarse).
          return null;
        }
        if (!re.test(value)) return 'el formato no es válido';
      }
      return null;
    }

    case 'number': {
      const num = typeof value === 'string' ? Number(value) : value;
      if (typeof num !== 'number' || !Number.isFinite(num)) {
        return 'debe ser un número';
      }
      if (typeof field.min === 'number' && num < field.min) {
        return `debe ser mayor o igual que ${field.min}`;
      }
      if (typeof field.max === 'number' && num > field.max) {
        return `debe ser menor o igual que ${field.max}`;
      }
      return null;
    }

    case 'checkbox':
      if (typeof value !== 'boolean') return 'debe ser verdadero o falso';
      return null;

    case 'date': {
      if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) {
        return 'debe ser una fecha (YYYY-MM-DD)';
      }
      const ts = Date.parse(value);
      if (Number.isNaN(ts)) return 'la fecha no es válida';
      return null;
    }

    case 'select':
    case 'radio': {
      if (typeof value !== 'string') return 'valor no válido';
      if (!optionValues(field).has(value)) {
        return 'la opción seleccionada no es válida';
      }
      return null;
    }

    case 'multiselect': {
      if (!Array.isArray(value)) return 'debe ser una lista de opciones';
      const allowed = optionValues(field);
      for (const v of value) {
        if (typeof v !== 'string' || !allowed.has(v)) {
          return 'contiene una opción no válida';
        }
      }
      if (new Set(value).size !== value.length) {
        return 'contiene opciones repetidas';
      }
      return null;
    }

    default:
      return null;
  }
}

function optionValues(field: PersistedFieldSchema): ReadonlySet<string> {
  if (!isChoiceType(field.type)) return new Set();
  return new Set((field.options ?? []).map((o) => o.value));
}

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}
