import { isFieldVisible } from '../conditions/evaluate.ts';
import { collectDataFields } from '../helpers/walk.ts';
import type { DataField } from '../types/field.ts';
import type { FormSchema, FormValues } from '../types/form.ts';
import type { Validation } from '../types/validation.ts';
import {
  isIban,
  isInteger,
  isLuhnValid,
  isPhone,
  isTaxId,
  isUrl,
} from './formats.ts';
import { defaultMessage } from './messages.ts';

/**
 * Validador custom resuelto en runtime. Devuelve un mensaje de error (string)
 * si el valor es inválido, o `null`/`undefined` si es válido.
 */
export type CustomValidator = (
  value: unknown,
  values: FormValues,
) => string | null | undefined;

export interface ValidateOptions {
  /** Registro de validadores para las validaciones `{ kind: 'custom', ref }`. */
  validators?: Record<string, CustomValidator>;
  /**
   * Si es `true`, valida también los campos ocultos por `visibleWhen`/`hidden`.
   * Por defecto los campos no visibles no se validan.
   */
  validateHidden?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  /** Errores por nombre de campo (en orden de declaración de validaciones). */
  errors: Record<string, string[]>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function asString(value: unknown): string {
  return value == null ? '' : String(value);
}

/** Aplica una sola validación a un valor. Devuelve mensaje o `null` si pasa. */
function runValidation(
  validation: Validation,
  value: unknown,
  values: FormValues,
  options: ValidateOptions,
): string | null {
  const message = validation.message ?? defaultMessage(validation);

  switch (validation.kind) {
    case 'required':
      return isEmpty(value) ? message : null;

    // Las validaciones de formato no se aplican a valores vacíos: un campo
    // opcional vacío es válido salvo que tenga además `required`.
    case 'minLength':
      if (isEmpty(value)) return null;
      return asString(value).length < validation.value ? message : null;
    case 'maxLength':
      if (isEmpty(value)) return null;
      return asString(value).length > validation.value ? message : null;
    case 'min':
      if (isEmpty(value)) return null;
      return Number(value) < validation.value ? message : null;
    case 'max':
      if (isEmpty(value)) return null;
      return Number(value) > validation.value ? message : null;
    case 'pattern': {
      if (isEmpty(value)) return null;
      const re = new RegExp(validation.value, validation.flags);
      return re.test(asString(value)) ? null : message;
    }
    case 'email':
      if (isEmpty(value)) return null;
      return EMAIL_RE.test(asString(value)) ? null : message;
    case 'url':
      if (isEmpty(value)) return null;
      return isUrl(asString(value)) ? null : message;
    case 'integer':
      if (isEmpty(value)) return null;
      return isInteger(value) ? null : message;
    case 'phone':
      if (isEmpty(value)) return null;
      return isPhone(asString(value)) ? null : message;
    case 'iban':
      if (isEmpty(value)) return null;
      return isIban(asString(value)) ? null : message;
    case 'taxId':
      if (isEmpty(value)) return null;
      return isTaxId(asString(value), validation.country) ? null : message;
    case 'creditCard':
      if (isEmpty(value)) return null;
      return isLuhnValid(asString(value)) ? null : message;
    case 'custom': {
      const fn = options.validators?.[validation.ref];
      if (!fn) {
        // Validador no registrado: no podemos evaluarlo. Avisamos en dev y no
        // bloqueamos el formulario (forward-compatible).
        console.warn(
          `[@core/forms] validador custom no registrado: "${validation.ref}"`,
        );
        return null;
      }
      const result = fn(value, values);
      if (result == null) return null;
      return result === '' ? message : result;
    }
    default:
      return null;
  }
}

function fieldValidations(field: DataField): Validation[] {
  const list = field.validations ? [...field.validations] : [];
  // `required: true` en el campo implica una validación `required` si no se
  // declaró ya explícitamente en el catálogo.
  if (field.required && !list.some((v) => v.kind === 'required')) {
    list.unshift({ kind: 'required' });
  }
  return list;
}

/**
 * Evalúa todas las validaciones de un schema contra un conjunto de valores.
 * Función pura. Los campos no visibles no se validan (salvo `validateHidden`).
 */
export function validateForm(
  schema: FormSchema,
  values: FormValues,
  options: ValidateOptions = {},
): ValidationResult {
  const errors: Record<string, string[]> = {};

  for (const field of collectDataFields(schema.fields)) {
    if (!options.validateHidden && !isFieldVisible(field, values)) continue;

    const value = values[field.name];
    const messages: string[] = [];
    for (const validation of fieldValidations(field)) {
      const error = runValidation(validation, value, values, options);
      if (error) messages.push(error);
    }
    if (messages.length > 0) errors[field.name] = messages;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
